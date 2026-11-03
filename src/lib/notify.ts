import { db } from "./db";
import { sendPlain } from "./mailer";

/**
 * Best-effort notification to the workspace owner through the workspace's
 * default sender profile. Never throws: a failed notification must not break
 * the reviewer's action.
 */
export async function notifyWorkspaceOwner(workspaceId: string, msg: { subject: string; text: string }) {
  try {
    const ws = await db.workspace.findUnique({ where: { id: workspaceId }, include: { owner: true } });
    if (!ws?.owner?.email) return;
    await sendFromWorkspace(workspaceId, ws.owner.email, msg);
  } catch (err) {
    console.warn("notification failed:", err instanceof Error ? err.message : err);
  }
}

/** Send a plain-text email from the workspace's default (or first) sender profile. */
export async function sendFromWorkspace(workspaceId: string, to: string, msg: { subject: string; text: string }) {
  const sender =
    (await db.senderProfile.findFirst({ where: { workspaceId, isDefault: true } })) ??
    (await db.senderProfile.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } }));
  if (!sender) throw new Error("No sender profile configured");
  await sendPlain(sender.id, to, msg.subject, msg.text);
}
