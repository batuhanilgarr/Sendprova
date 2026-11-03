import { ArrowLeftIcon, FileTextIcon, RefreshCwIcon } from "lucide-react";
import { FindingsList, ScoreCard } from "@/components/score-card";
import { kitFromClient, sendReadyScore } from "@/lib/score";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AgencyComments, AgencyPreview, NotifyClientForm } from "@/components/agency-review";
import { StatusBadge } from "@/components/review-workbench";
import { toThreads } from "@/lib/threads";
import { SendPanel } from "@/components/send-panel";
import { ShareDialog } from "@/components/share-dialog";
import { shareUrl } from "@/lib/share";
import { WorkbenchPanel } from "@/components/workbench-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkResultSchema, type CheckResult } from "@/lib/checks";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ensureDefaultSender } from "@/lib/mailer";
import { runChecksAction, setClientAction, setStatusAction } from "./actions";
import { latestApproval, listComments } from "@/lib/review";
import { deadlineState, loadDiffViews, revisionRounds } from "@/lib/review-rounds";
import { textDiff } from "@/lib/diff";
import { VersionDiff } from "@/components/version-diff";
import { CompareButton } from "@/components/compare-panel";
import { saveReviewSettingsAction } from "./actions";

type Tone = "ok" | "warn" | "err";

export default function ProjectPage({ params, searchParams }: PageProps<"/app/p/[id]">) {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <Workbench params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Workbench({ params, searchParams }: PageProps<"/app/p/[id]">) {
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const { v } = await searchParams;
  const project = await db.project.findUnique({
    where: { id, ...(user.role === "admin" ? {} : { workspace: { ownerId: user.id } }) },
    include: { versions: { orderBy: { number: "desc" }, include: { assets: { orderBy: { path: "asc" } } } }, client: true },
  });
  if (!project || project.versions.length === 0) notFound();

  const version = project.versions.find((x) => String(x.number) === v) ?? project.versions[0];

  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: project.workspaceId } });
  await ensureDefaultSender(workspace.id);
  const [senders, groups, sends, lastRun] = await Promise.all([
    db.senderProfile.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } }),
    db.recipientGroup.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { recipients: true } } } }),
    db.testSend.findMany({
      where: { versionId: version.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { deliveries: { orderBy: { email: "asc" } } },
    }),
    db.checkRun.findFirst({ where: { versionId: version.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const [shares, clients, rawThreads, approval] = await Promise.all([
    db.shareLink.findMany({ where: { projectId: project.id, revokedAt: null }, orderBy: { createdAt: "desc" } }),
    db.client.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    listComments(version.id),
    latestApproval(version.id),
  ]);
  const threads = toThreads(rawThreads);
  const [diffData, rounds] = await Promise.all([loadDiffViews(version.id), revisionRounds(project.id)]);
  const diffText = diffData ? textDiff(diffData.baseHtml, diffData.html) : null;
  const deadline = deadlineState(project.reviewDeadline, project.status);
  const previous = project.versions.find((x) => x.number < version.number);
  const openComments = threads.filter((t) => !t.resolvedAt).length;
  const checkRun = lastRun ? checkResultSchema.safeParse(lastRun.result) : null;
  const live: CheckResult | null = checkRun?.success ? checkRun.data : null;

  const result = sendReadyScore({
    html: version.html,
    htmlBytes: version.htmlBytes,
    assetCount: version.assets.length,
    missingAssets: version.missingAssets,
    placeholders: version.placeholders,
    live,
    kit: kitFromClient(project.client),
  });
  const { score, findings, counts } = result;

  const panel = (
    <>
      <Section title={`Comments · ${openComments} open`}>
        {approval && (
          <p className="mb-2 rounded-lg border px-2.5 py-1.5">
            <span className="font-medium">{approval.reviewerName}</span> {approval.decision === "APPROVED" ? "approved" : "requested changes on"} v{version.number}
            <time className="ml-1 text-xs text-muted-foreground">{approval.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time>
            {approval.note && <span className="block text-muted-foreground mt-1 whitespace-pre-wrap">{approval.note}</span>}
          </p>
        )}
        <AgencyComments projectId={project.id} threads={threads} />
        <div className="mt-3 border-t pt-3">
          <NotifyClientForm projectId={project.id} contactEmail={project.client?.contactEmail ?? null} />
        </div>
      </Section>

      {previous && (
        <Section title={`Changes vs v${previous.number}`} action={<CompareButton projectId={project.id} versionId={version.id} hasDiff={!!diffData} />}>
          {diffData && diffText ? (
            <VersionDiff baseNumber={diffData.baseNumber} number={diffData.number} views={diffData.views} text={diffText} />
          ) : (
            <p className="text-muted-foreground">Render both versions and highlight what changed, so the client only reviews the differences.</p>
          )}
        </Section>
      )}

      <Section title="Review settings">
        <form action={saveReviewSettingsAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Revision rounds
            <input name="revisionLimit" type="number" min={0} max={20} defaultValue={project.revisionLimit} className="h-8 w-20 rounded-lg border bg-transparent px-2 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Approval deadline
            <input name="reviewDeadline" type="date" defaultValue={project.reviewDeadline ? project.reviewDeadline.toISOString().slice(0, 10) : ""} className="h-8 rounded-lg border bg-transparent px-2 text-sm text-foreground" />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>
        <p className="mt-2 text-muted-foreground">
          Round {rounds}/{project.revisionLimit} used{rounds >= project.revisionLimit && project.revisionLimit > 0 ? "; further rounds are outside the agreed scope." : "."}
          {deadline && <span className={`ml-2 text-${deadline.tone}`}>{deadline.label}</span>}
        </p>
      </Section>

      <Section
        title="Send-ready"
        action={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="xs" nativeButton={false} render={<a href={`/api/versions/${version.id}/preflight.pdf`} target="_blank" rel="noreferrer" />}>
              <FileTextIcon data-icon="inline-start" />
              PDF
            </Button>
            <form action={runChecksAction}>
              <input type="hidden" name="versionId" value={version.id} />
              <input type="hidden" name="projectId" value={project.id} />
              <Button type="submit" variant="outline" size="xs">
                <RefreshCwIcon data-icon="inline-start" />
                {live ? "Re-run" : "Check links"}
              </Button>
            </form>
          </div>
        }
      >
        <ScoreCard score={score} counts={counts} hasKit={!!project.client && !!kitFromClient(project.client)} />
        <FindingsList findings={findings} />
        {!kitFromClient(project.client) && (
          <p className="mt-2 text-muted-foreground">
            Add a brand kit to the client in{" "}
            <Link href="/app/settings" className="underline underline-offset-2">
              Settings
            </Link>{" "}
            to check colors, fonts, legal footer and UTM tracking.
          </p>
        )}
      </Section>

      {version.subject && (
        <Section title="Subject (title)">
          <p className="text-muted-foreground">{version.subject}</p>
        </Section>
      )}

      {version.placeholders.length > 0 && (
        <Section title="Placeholders">
          <ul className="flex flex-wrap gap-1">
            {version.placeholders.map((p) => (
              <li key={p}>
                <Badge variant="secondary" className="font-mono">
                  {p}
                </Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {version.missingAssets.length > 0 && (
        <Section title="Unmatched images">
          <ul className="flex flex-col gap-1 font-mono text-[11px] text-err">
            {version.missingAssets.map((m) => (
              <li key={m} className="truncate">
                {m}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Images · ${version.assets.length}`}>
        <ul className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-4 gap-1.5">
          {version.assets
            .filter((a) => a.mime.startsWith("image/"))
            .map((a) => (
              <li key={a.id} className="aspect-square rounded-md border bg-muted overflow-hidden" title={`${a.path} · ${(a.bytes / 1024).toFixed(1)} KB`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.path} className="size-full object-contain" loading="lazy" />
              </li>
            ))}
        </ul>
      </Section>

      <Section title="Send test">
        <SendPanel
          versionId={version.id}
          projectId={project.id}
          defaultSubject={version.subject ?? project.name}
          senders={senders.map((s) => ({ id: s.id, name: s.name, fromEmail: s.fromEmail, isDefault: s.isDefault }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name, count: g._count.recipients }))}
        />
        <p className="text-muted-foreground mt-2">
          Manage senders and groups in{" "}
          <Link href="/app/settings" className="underline underline-offset-2">
            Settings
          </Link>
          .
        </p>
      </Section>

      {sends.length > 0 && (
        <Section title="Send history">
          <ul className="flex flex-col gap-3">
            {sends.map((s) => (
              <li key={s.id}>
                <div className="flex items-center gap-2">
                  <Dot tone={s.status === "SENT" ? "ok" : s.status === "FAILED" ? "err" : "warn"} />
                  <span className="truncate flex-1">{s.subject}</span>
                  <time className="text-muted-foreground text-xs" dateTime={s.createdAt.toISOString()}>
                    {s.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </div>
                <ul className="mt-1 ml-4 flex flex-col gap-0.5 font-mono text-[11px]">
                  {s.deliveries.map((d) => (
                    <li key={d.id} className={d.status === "FAILED" ? "text-err" : "text-muted-foreground"} title={d.error ?? d.messageId ?? ""}>
                      {d.status === "SENT" ? "✓" : d.status === "FAILED" ? "✕" : "…"} {d.email}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="min-h-11 shrink-0 border-b bg-background flex items-center gap-2 px-3 sm:px-4 py-1.5">
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/app" aria-label="Back to projects" />}>
            <ArrowLeftIcon />
          </Button>
          <h1 className="font-medium truncate min-w-0">{project.name}</h1>
          <Badge variant="secondary" className="font-mono hidden sm:inline-flex">
            {version.sourceKind}
          </Badge>
          <form action={setStatusAction} className="hidden sm:block">
            <input type="hidden" name="projectId" value={project.id} />
            <select
              name="status"
              defaultValue={project.status}
              aria-label="Project status"
              className="h-7 rounded-md border bg-transparent px-1.5 text-xs outline-none"
            >
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In review</option>
              <option value="CHANGES_REQUESTED">Changes requested</option>
              <option value="APPROVED">Approved</option>
            </select>
            <Button type="submit" size="xs" variant="ghost">
              Set
            </Button>
          </form>
          <span className="sm:hidden">
            <StatusBadge status={project.status} />
          </span>
          <form action={setClientAction} className="hidden md:flex items-center gap-1">
            <input type="hidden" name="projectId" value={project.id} />
            <select name="clientId" defaultValue={project.clientId ?? ""} aria-label="Client" className="h-7 max-w-40 rounded-md border bg-transparent px-1.5 text-xs outline-none">
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="xs" variant="ghost">
              Assign
            </Button>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground" title="Revision rounds used / agreed">
              <span className={rounds > project.revisionLimit && project.revisionLimit > 0 ? "text-err" : ""}>R {rounds}/{project.revisionLimit}</span>
              {deadline && <span className={`text-${deadline.tone}`}>{deadline.label}</span>}
            </span>
            <CountBadges counts={counts} />
            <ShareDialog
              projectId={project.id}
              shares={shares.map((s) => ({ id: s.id, url: shareUrl(s.token), createdAt: s.createdAt.toISOString(), views: s.views }))}
            />
            <nav className="flex items-center gap-0.5" aria-label="Versions">
              {project.versions.map((x) => (
                <Button
                  key={x.id}
                  variant={x.id === version.id ? "default" : "ghost"}
                  size="xs"
                  className="font-mono"
                  nativeButton={false}
                  render={<Link href={`/app/p/${project.id}?v=${x.number}`} aria-current={x.id === version.id ? "page" : undefined} />}
                >
                  v{x.number}
                </Button>
              ))}
            </nav>
          </div>
        </div>
        <AgencyPreview src={`/api/versions/${version.id}/html`} threads={threads} />
      </div>

      <WorkbenchPanel summary={<CountBadges counts={counts} compact />}>{panel}</WorkbenchPanel>
    </div>
  );
}

function Dot({ tone }: { tone: Tone }) {
  return <span className={`mt-1.5 size-2 shrink-0 rounded-full ${tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-err"}`} aria-label={tone} />;
}

function CountBadges({ counts, compact }: { counts: Record<Tone, number>; compact?: boolean }) {
  const items: [Tone, string][] = [
    ["ok", "bg-ok"],
    ["warn", "bg-warn"],
    ["err", "bg-err"],
  ];
  return (
    <span className={`flex items-center gap-2 font-mono text-[11px] ${compact ? "ml-1" : "text-muted-foreground"}`}>
      {items.map(([tone, cls]) =>
        counts[tone] > 0 || !compact ? (
          <span key={tone} className="flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${cls}`} />
            {counts[tone]}
          </span>
        ) : null,
      )}
    </span>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
