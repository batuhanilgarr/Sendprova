import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReviewWorkbench } from "@/components/review-workbench";
import { toThreads } from "@/lib/threads";
import { db } from "@/lib/db";
import { latestApproval, listComments } from "@/lib/review";
import { resolveShare } from "@/lib/share";
import { loadDiffViews, revisionRounds, deadlineState } from "@/lib/review-rounds";
import { textDiff } from "@/lib/diff";
import { checkResultSchema, type CheckResult } from "@/lib/checks";
import { kitFromClient, sendReadyScore } from "@/lib/score";

export const metadata: Metadata = { title: "Review", robots: { index: false, follow: false } };

type Params = PageProps<"/s/[token]">["params"];

export default function SharePage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <Shared params={params} />
    </Suspense>
  );
}

async function Shared({ params }: { params: Params }) {
  await connection();
  const { token } = await params;
  const resolved = await resolveShare(token);
  if (!resolved) notFound();
  const { share, project, version } = resolved;
  const [threads, approval, diffData, rounds] = await Promise.all([
    listComments(version.id),
    latestApproval(version.id),
    loadDiffViews(version.id),
    revisionRounds(project.id),
    db.shareLink.update({ where: { id: share.id }, data: { views: { increment: 1 } } }),
  ]);
  const deadline = deadlineState(project.reviewDeadline, project.status);
  const [client, lastRun, assetCount] = await Promise.all([
    project.clientId ? db.client.findUnique({ where: { id: project.clientId } }) : null,
    db.checkRun.findFirst({ where: { versionId: version.id }, orderBy: { createdAt: "desc" } }),
    db.asset.count({ where: { versionId: version.id } }),
  ]);
  const parsedRun = lastRun ? checkResultSchema.safeParse(lastRun.result) : null;
  const live: CheckResult | null = parsedRun?.success ? parsedRun.data : null;
  const score = sendReadyScore({ html: version.html, htmlBytes: version.htmlBytes, assetCount, missingAssets: version.missingAssets, placeholders: version.placeholders, live, kit: kitFromClient(client) });

  return (
    <ReviewWorkbench
      token={token}
      src={`/api/share/${token}/html`}
      projectName={project.name}
      versionNumber={version.number}
      status={project.status}
      initialThreads={toThreads(threads)}
      lastDecision={approval ? { decision: approval.decision, reviewerName: approval.reviewerName, createdAt: approval.createdAt.toISOString(), note: approval.note } : null}
      diff={diffData ? { baseNumber: diffData.baseNumber, number: diffData.number, views: diffData.views, text: textDiff(diffData.baseHtml, diffData.html) } : null}
      rounds={{ used: rounds, limit: project.revisionLimit }}
      deadline={deadline}
      score={{ score: score.score, counts: score.counts, findings: score.findings, hasKit: !!kitFromClient(client) }}
    />
  );
}
