"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentWorkspace } from "@/lib/session";
import { parseEmails, smtpConfigSchema, verifySender } from "@/lib/mailer";
import { newToken } from "@/lib/share";

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

const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Client name is required"),
  contactName: z.string().trim().optional().default(""),
  contactEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #4F46E5").optional().or(z.literal("")),
  colors: z.string().optional().default(""),
  fonts: z.string().optional().default(""),
  footerText: z.string().trim().optional().default(""),
  physicalAddress: z.string().trim().optional().default(""),
  unsubscribeToken: z.string().trim().optional().default(""),
  utmTemplate: z.string().trim().optional().default(""),
  allowedDomains: z.string().optional().default(""),
});

const list = (raw: string) => [...new Set(raw.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];

export async function saveClient(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = clientSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name, contactName, contactEmail, color, colors, fonts, footerText, physicalAddress, unsubscribeToken, utmTemplate, allowedDomains } = parsed.data;
  const badColor = list(colors).find((c) => !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c));
  if (badColor) return { error: `"${badColor}" is not a hex color` };
  const workspace = await currentWorkspace();
  const data = {
    name,
    contactName: contactName || null,
    contactEmail: contactEmail || null,
    color: color || null,
    colors: list(colors),
    fonts: fonts.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean),
    footerText: footerText || null,
    physicalAddress: physicalAddress || null,
    unsubscribeToken: unsubscribeToken || null,
    utmTemplate: utmTemplate.replace(/^\?/, "") || null,
    allowedDomains: list(allowedDomains).map((d) => d.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")),
  };
  if (id) await db.client.update({ where: { id, workspaceId: workspace.id }, data });
  else await db.client.create({ data: { ...data, workspaceId: workspace.id } });
  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { ok: "Client saved." };
}

export async function deleteClient(form: FormData) {
  const workspace = await currentWorkspace();
  await db.client.delete({ where: { id: String(form.get("id")), workspaceId: workspace.id } });
  revalidatePath("/app/settings");
  revalidatePath("/app");
}

const brandingSchema = z.object({
  brandName: z.string().trim().max(80).optional().default(""),
  brandLogoUrl: z.string().trim().url("Logo must be a full https:// URL").max(500).optional().or(z.literal("")),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #4F46E5").optional().or(z.literal("")),
  reviewDomain: z.string().trim().toLowerCase().max(120).optional().default(""),
});

export async function saveBranding(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = brandingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { brandName, brandLogoUrl, brandColor, reviewDomain } = parsed.data;
  const workspace = await currentWorkspace();
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      brandName: brandName || null,
      brandLogoUrl: brandLogoUrl || null,
      brandColor: brandColor || null,
      hidePoweredBy: form.get("hidePoweredBy") === "on",
      reviewDomain: reviewDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null,
    },
  });
  revalidatePath("/app/settings");
  return { ok: "Branding saved." };
}

/** Create (or keep) the client's portal token and return nothing; the page re-renders with the link. */
export async function ensurePortalLink(form: FormData) {
  const id = String(form.get("id"));
  const workspace = await currentWorkspace();
  const client = await db.client.findUniqueOrThrow({ where: { id, workspaceId: workspace.id } });
  if (!client.portalToken) await db.client.update({ where: { id }, data: { portalToken: newToken() } });
  revalidatePath("/app/settings");
}

export async function revokePortalLink(form: FormData) {
  const id = String(form.get("id"));
  const workspace = await currentWorkspace();
  await db.client.update({ where: { id, workspaceId: workspace.id }, data: { portalToken: null } });
  revalidatePath("/app/settings");
}
