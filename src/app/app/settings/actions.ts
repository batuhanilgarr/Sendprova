"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentWorkspace } from "@/lib/session";
import { parseEmails, smtpConfigSchema, verifySender } from "@/lib/mailer";

export type ActionState = { ok?: string; error?: string } | null;

const senderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Profile name is required"),
  fromName: z.string().min(1, "From name is required"),
  fromEmail: z.string().email("Enter a valid email address"),
  host: z.string().min(1, "SMTP host is required"),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.coerce.boolean().default(false),
  user: z.string().optional().default(""),
  pass: z.string().optional().default(""),
});

export async function saveSender(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = senderSchema.safeParse({
    ...Object.fromEntries(form),
    secure: form.get("secure") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name, fromName, fromEmail, ...smtp } = parsed.data;
  const workspace = await currentWorkspace();
  const config = smtpConfigSchema.parse(smtp);

  if (id) {
    const current = await db.senderProfile.findUniqueOrThrow({ where: { id, workspaceId: workspace.id } });
    // Keep the stored password when the field is left blank.
    const prev = smtpConfigSchema.safeParse(current.config);
    if (!config.pass && prev.success) config.pass = prev.data.pass;
    await db.senderProfile.update({ where: { id }, data: { name, fromName, fromEmail, config } });
  } else {
    const count = await db.senderProfile.count({ where: { workspaceId: workspace.id } });
    await db.senderProfile.create({
      data: { workspaceId: workspace.id, name, fromName, fromEmail, transport: "SMTP", config, isDefault: count === 0 },
    });
  }
  revalidatePath("/app/settings");
  return { ok: "Sender saved." };
}

export async function deleteSender(form: FormData) {
  const id = String(form.get("id"));
  const workspace = await currentWorkspace();
  await db.senderProfile.delete({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/settings");
}

export async function setDefaultSender(form: FormData) {
  const id = String(form.get("id"));
  const workspace = await currentWorkspace();
  await db.$transaction([
    db.senderProfile.updateMany({ where: { workspaceId: workspace.id }, data: { isDefault: false } }),
    db.senderProfile.update({ where: { id, workspaceId: workspace.id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/app/settings");
}

export async function testSenderConnection(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const workspace = await currentWorkspace();
    const sender = await db.senderProfile.findUniqueOrThrow({ where: { id: String(form.get("id")), workspaceId: workspace.id } });
    await verifySender(sender.id);
    return { ok: "SMTP connection succeeded." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Group name is required"),
  emails: z.string(),
});

export async function saveGroup(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = groupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name } = parsed.data;
  const emails = parseEmails(parsed.data.emails);
  if (emails.length === 0) return { error: "Enter at least one valid email address." };
  const workspace = await currentWorkspace();

  if (id) {
    await db.$transaction([
      db.recipient.deleteMany({ where: { groupId: id } }),
      db.recipientGroup.update({ where: { id, workspaceId: workspace.id }, data: { name, recipients: { create: emails.map((email) => ({ email })) } } }),
    ]);
  } else {
    await db.recipientGroup.create({
      data: { workspaceId: workspace.id, name, recipients: { create: emails.map((email) => ({ email })) } },
    });
  }
  revalidatePath("/app/settings");
  return { ok: "Group saved." };
}

export async function deleteGroup(form: FormData) {
  const workspace = await currentWorkspace();
  await db.recipientGroup.delete({ where: { id: String(form.get("id")), workspaceId: workspace.id } });
  revalidatePath("/app/settings");
}
