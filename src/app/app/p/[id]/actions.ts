"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runChecks } from "@/lib/checks";
import { db } from "@/lib/db";
import { parseEmails, sendTest } from "@/lib/mailer";
import { newToken } from "@/lib/share";
import { requireProjectAccess } from "@/lib/session";
import { sendFromWorkspace } from "@/lib/notify";
import { appUrl } from "@/lib/review";
import { shareUrl } from "@/lib/share";

export async function createShareAction(form: FormData) {
  const projectId = String(form.get("projectId"));
  await requireProjectAccess(projectId);
  await db.shareLink.create({ data: { projectId, token: newToken() } });
  revalidatePath(`/app/p/${projectId}`);
}

export async function revokeShareAction(form: FormData) {
  const id = String(form.get("id"));
  const projectId = String(form.get("projectId"));
  await requireProjectAccess(projectId);
  await db.shareLink.update({ where: { id, projectId }, data: { revokedAt: new Date() } });
  revalidatePath(`/app/p/${projectId}`);
}

export async function runChecksAction(form: FormData) {
  const versionId = String(form.get("versionId"));
  const projectId = String(form.get("projectId"));
  await requireProjectAccess(projectId);
  await runChecks(versionId);
  revalidatePath(`/app/p/${projectId}`);
}

export type SendState = { ok?: string; error?: string } | null;

const schema = z.object({
  versionId: z.string().min(1),
  projectId: z.string().min(1),
  senderId: z.string().min(1, "Select a sender"),
  subject: z.string().min(1, "Subject is required"),
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
  let user;
  try {
    ({ user } = await requireProjectAccess(projectId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  const groups = groupIds.length
    ? await db.recipientGroup.findMany({ where: { id: { in: groupIds } }, include: { recipients: true } })
    : [];
  const emails = [...groups.flatMap((g) => g.recipients.map((r) => r.email)), ...parseEmails(extra)];
  if (emails.length === 0) return { error: "Select a group or enter an email address." };

  try {
    const result = await sendTest({ versionId, senderId, subject, emails, userId: user.id });
    revalidatePath(`/app/p/${projectId}`);
    const sent = result.deliveries.filter((d) => d.status === "SENT").length;
    const failed = result.deliveries.length - sent;
    return failed ? { error: `${sent} sent, ${failed} failed.` } : { ok: `Sent to ${sent} recipient${sent === 1 ? "" : "s"}.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function setClientAction(form: FormData) {
  const projectId = String(form.get("projectId"));
  const clientId = String(form.get("clientId") || "");
  const { project } = await requireProjectAccess(projectId);
  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.workspaceId !== project.workspaceId) throw new Error("Client not found");
  }
  await db.project.update({ where: { id: projectId }, data: { clientId: clientId || null } });
  revalidatePath(`/app/p/${projectId}`);
  revalidatePath("/app");
}

export async function setStatusAction(form: FormData) {
  const projectId = String(form.get("projectId"));
  const status = String(form.get("status"));
  await requireProjectAccess(projectId);
  if (!["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED"].includes(status)) return;
  await db.project.update({ where: { id: projectId }, data: { status: status as "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" } });
  revalidatePath(`/app/p/${projectId}`);
  revalidatePath("/app");
}

export async function replyCommentAction(form: FormData) {
  const projectId = String(form.get("projectId"));
  const parentId = String(form.get("parentId"));
  const body = String(form.get("body") ?? "").trim();
  if (!body) return;
  const { user } = await requireProjectAccess(projectId);
  const parent = await db.comment.findUniqueOrThrow({ where: { id: parentId }, include: { version: true } });
  if (parent.version.projectId !== projectId) throw new Error("Thread not found");
  await db.comment.create({
    data: { versionId: parent.versionId, parentId, body, authorName: user.name || user.email, authorEmail: user.email, byUserId: user.id },
  });
  revalidatePath(`/app/p/${projectId}`);
}

export async function resolveCommentAction(form: FormData) {
  const projectId = String(form.get("projectId"));
  const id = String(form.get("id"));
  const resolved = form.get("resolved") === "1";
  await requireProjectAccess(projectId);
  const c = await db.comment.findUniqueOrThrow({ where: { id }, include: { version: true } });
  if (c.version.projectId !== projectId) throw new Error("Comment not found");
  await db.comment.update({ where: { id }, data: { resolvedAt: resolved ? new Date() : null } });
  revalidatePath(`/app/p/${projectId}`);
}

export type NotifyState = { ok?: string; error?: string } | null;

/** Email the client contact a review link (creating one if none is active). */
export async function notifyClientAction(_prev: NotifyState, form: FormData): Promise<NotifyState> {
  const projectId = String(form.get("projectId"));
  const message = String(form.get("message") ?? "").trim();
  try {
    const { project, user } = await requireProjectAccess(projectId);
    const client = project.clientId ? await db.client.findUnique({ where: { id: project.clientId } }) : null;
    if (!client?.contactEmail) return { error: "Assign a client with a contact email first." };
    let share = await db.shareLink.findFirst({ where: { projectId, revokedAt: null }, orderBy: { createdAt: "desc" } });
    if (!share) share = await db.shareLink.create({ data: { projectId, token: newToken() } });
    const latest = await db.version.findFirstOrThrow({ where: { projectId }, orderBy: { number: "desc" } });
    const text = [
      `Hi${client.contactName ? ` ${client.contactName}` : ""},`,
      "",
      `Version ${latest.number} of "${project.name}" is ready for your review:`,
      shareUrl(share.token),
      "",
      "Open the link, click Comment to pin notes on the email, then Approve or Request changes. No account needed.",
      message ? `\n${message}\n` : "",
      `— ${user.name || user.email}`,
      "",
      `Sent with Sendprova · ${appUrl()}`,
    ].join("\n");
    await sendFromWorkspace(project.workspaceId, client.contactEmail, { subject: `Please review: ${project.name} (v${latest.number})`, text });
    if (project.status === "DRAFT") await db.project.update({ where: { id: projectId }, data: { status: "IN_REVIEW" } });
    revalidatePath(`/app/p/${projectId}`);
    return { ok: `Sent to ${client.contactEmail}.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
