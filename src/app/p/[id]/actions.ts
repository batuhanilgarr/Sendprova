"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runChecks } from "@/lib/checks";
import { db } from "@/lib/db";
import { parseEmails, sendTest } from "@/lib/mailer";
import { newToken } from "@/lib/share";

export async function createShareAction(form: FormData) {
  const projectId = String(form.get("projectId"));
  await db.shareLink.create({ data: { projectId, token: newToken() } });
  revalidatePath(`/p/${projectId}`);
}

export async function revokeShareAction(form: FormData) {
  const id = String(form.get("id"));
  const projectId = String(form.get("projectId"));
  await db.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
  revalidatePath(`/p/${projectId}`);
}

export async function runChecksAction(form: FormData) {
  const versionId = String(form.get("versionId"));
  const projectId = String(form.get("projectId"));
  await runChecks(versionId);
  revalidatePath(`/p/${projectId}`);
}

export type SendState = { ok?: string; error?: string } | null;

const schema = z.object({
  versionId: z.string().min(1),
  projectId: z.string().min(1),
  senderId: z.string().min(1, "Gönderici seçin"),
  subject: z.string().min(1, "Konu gerekli"),
  groupIds: z.array(z.string()).default([]),
  extra: z.string().default(""),
});

export async function sendTestAction(_prev: SendState, form: FormData): Promise<SendState> {
  const parsed = schema.safeParse({
    versionId: form.get("versionId"),
    projectId: form.get("projectId"),
    senderId: form.get("senderId"),
    subject: form.get("subject"),
    groupIds: form.getAll("groupIds").map(String),
    extra: form.get("extra") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { versionId, projectId, senderId, subject, groupIds, extra } = parsed.data;

  const groups = groupIds.length
    ? await db.recipientGroup.findMany({ where: { id: { in: groupIds } }, include: { recipients: true } })
    : [];
  const emails = [...groups.flatMap((g) => g.recipients.map((r) => r.email)), ...parseEmails(extra)];
  if (emails.length === 0) return { error: "Bir grup seçin veya e-posta girin." };

  try {
    const result = await sendTest({ versionId, senderId, subject, emails });
    revalidatePath(`/p/${projectId}`);
    const sent = result.deliveries.filter((d) => d.status === "SENT").length;
    const failed = result.deliveries.length - sent;
    return failed ? { error: `${sent} gönderildi, ${failed} başarısız.` } : { ok: `${sent} alıcıya gönderildi.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
