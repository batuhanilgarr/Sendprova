import { db } from "./db";

/** Revision rounds used so far = "changes requested" decisions across the project. */
export async function revisionRounds(projectId: string) {
  return db.approval.count({ where: { decision: "CHANGES_REQUESTED", version: { projectId } } });
}

export function deadlineState(deadline: Date | null, status: string) {
  if (!deadline || status === "APPROVED") return null;
  const ms = deadline.getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (ms < 0) return { label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, tone: "err" as const };
  if (days <= 2) return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, tone: "warn" as const };
  return { label: `Due ${deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, tone: "ok" as const };
}

/** Build the data the VersionDiff component needs, or null when no diff has been computed. */
export async function loadDiffViews(versionId: string) {
  const diffs = await db.versionDiff.findMany({ where: { versionId }, include: { baseVersion: { include: { snapshots: true } }, version: { include: { snapshots: true } } } });
  if (diffs.length === 0) return null;
  const base = diffs[0].baseVersion;
  const views = diffs
    .map((d) => {
      const before = base.snapshots.find((s) => s.device === d.device);
      const after = d.version.snapshots.find((s) => s.device === d.device);
      if (!before || !after) return null;
      return { device: d.device as "desktop" | "mobile", beforeUrl: before.url, afterUrl: after.url, diffUrl: d.diffUrl, width: d.width, height: d.height, changedRatio: d.changedRatio };
    })
    .filter((v): v is NonNullable<typeof v> => !!v)
    .sort((a) => (a.device === "desktop" ? -1 : 1));
  return { baseNumber: base.number, number: diffs[0].version.number, baseHtml: base.html, html: diffs[0].version.html, views };
}
