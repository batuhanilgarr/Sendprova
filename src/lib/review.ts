import { z } from "zod";
import { db } from "./db";
import { notifyWorkspaceOwner } from "./notify";
import { resolveShare } from "./share";

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(4000),
  authorName: z.string().trim().min(1, "Name is required").max(120),
  authorEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  parentId: z.string().optional(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional(),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  note: z.string().trim().max(4000).optional(),
  reviewerName: z.string().trim().min(1, "Name is required").max(120),
  reviewerEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
});
export type DecisionInput = z.infer<typeof decisionSchema>;

export const commentInclude = {
  replies: { orderBy: { createdAt: "asc" as const } },
};

/** Threads (top-level comments with replies) for a version. */
export function listComments(versionId: string) {
  return db.comment.findMany({
    where: { versionId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: commentInclude,
  });
}

export function latestApproval(versionId: string) {
  return db.approval.findFirst({ where: { versionId }, orderBy: { createdAt: "desc" } });
}

/** A reviewer (no account) comments through a share token. */
export async function addReviewerComment(token: string, input: CommentInput) {
  const resolved = await resolveShare(token);
  if (!resolved) throw new Error("This review link is no longer valid");
  const { project, version } = resolved;

  if (input.parentId) {
    const parent = await db.comment.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.versionId !== version.id) throw new Error("Thread not found");
  }

  const comment = await db.comment.create({
    data: {
      versionId: version.id,
      parentId: input.parentId,
      x: input.parentId ? null : input.x,
      y: input.parentId ? null : input.y,
      device: input.parentId ? null : input.device,
      body: input.body,
      authorName: input.authorName,
      authorEmail: input.authorEmail || null,
    },
  });

  if (project.status === "DRAFT") await db.project.update({ where: { id: project.id }, data: { status: "IN_REVIEW" } });

  void notifyWorkspaceOwner(project.workspaceId, {
    subject: `New comment on "${project.name}" (v${version.number})`,
    text: `${input.authorName} wrote:\n\n${input.body}\n\nOpen the project: ${appUrl()}/app/p/${project.id}`,
  });
  return comment;
}

export async function recordDecision(token: string, input: DecisionInput) {
  const resolved = await resolveShare(token);
  if (!resolved) throw new Error("This review link is no longer valid");
  const { project, version } = resolved;

  const approval = await db.approval.create({
    data: {
      versionId: version.id,
      decision: input.decision,
      note: input.note || null,
      reviewerName: input.reviewerName,
      reviewerEmail: input.reviewerEmail || null,
    },
  });
  await db.project.update({ where: { id: project.id }, data: { status: input.decision } });

  const label = input.decision === "APPROVED" ? "approved" : "requested changes on";
  void notifyWorkspaceOwner(project.workspaceId, {
    subject: `${input.reviewerName} ${label} "${project.name}" (v${version.number})`,
    text: `${input.reviewerName}${input.reviewerEmail ? ` <${input.reviewerEmail}>` : ""} ${label} version ${version.number}.${
      input.note ? `\n\nNote:\n${input.note}` : ""
    }\n\nOpen the project: ${appUrl()}/app/p/${project.id}`,
  });
  return approval;
}

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
