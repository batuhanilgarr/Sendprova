import { randomBytes } from "node:crypto";
import { db } from "./db";

export function newToken() {
  return randomBytes(18).toString("base64url");
}

/** Resolve a share token to its project and latest version, or null if unknown/revoked. */
export async function resolveShare(token: string) {
  const share = await db.shareLink.findUnique({
    where: { token },
    include: {
      project: { include: { versions: { orderBy: { number: "desc" }, take: 1 } } },
    },
  });
  if (!share || share.revokedAt) return null;
  const version = share.project.versions[0];
  if (!version) return null;
  return { share, project: share.project, version };
}

export function shareUrl(token: string) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/s/${token}`;
}

export function portalUrl(token: string) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/c/${token}`;
}
