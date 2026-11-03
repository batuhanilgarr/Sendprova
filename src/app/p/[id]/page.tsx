import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Preview } from "@/components/preview";
import { SendPanel } from "@/components/send-panel";
import { ShareDialog } from "@/components/share-dialog";
import { shareUrl } from "@/lib/share";
import { WorkbenchPanel } from "@/components/workbench-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkResultSchema, type CheckResult } from "@/lib/checks";
import { db, defaultWorkspace } from "@/lib/db";
import { ensureDefaultSender } from "@/lib/mailer";
import { runChecksAction } from "./actions";

const GMAIL_CLIP_BYTES = 102 * 1024;

type Tone = "ok" | "warn" | "err";
type Check = { tone: Tone; text: string };

export default function ProjectPage({ params, searchParams }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Yükleniyor…</div>}>
      <Workbench params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Workbench({ params, searchParams }: PageProps<"/p/[id]">) {
  await connection();
  const { id } = await params;
  const { v } = await searchParams;
  const project = await db.project.findUnique({
    where: { id },
    include: { versions: { orderBy: { number: "desc" }, include: { assets: { orderBy: { path: "asc" } } } } },
  });
  if (!project || project.versions.length === 0) notFound();

  const version = project.versions.find((x) => String(x.number) === v) ?? project.versions[0];

  await ensureDefaultSender();
  const workspace = await defaultWorkspace();
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
  const shares = await db.shareLink.findMany({ where: { projectId: project.id, revokedAt: null }, orderBy: { createdAt: "desc" } });
  const checkRun = lastRun ? checkResultSchema.safeParse(lastRun.result) : null;
  const live: CheckResult | null = checkRun?.success ? checkRun.data : null;

  const kb = version.htmlBytes / 1024;
  const checks: Check[] = [
    version.htmlBytes > GMAIL_CLIP_BYTES
      ? { tone: "warn", text: `HTML ${kb.toFixed(1)} KB. Gmail 102 KB üzerini kırpar.` }
      : { tone: "ok", text: `HTML ${kb.toFixed(1)} KB, Gmail sınırının altında.` },
    version.missingAssets.length
      ? { tone: "err", text: `${version.missingAssets.length} görsel referansı eşleşmedi.` }
      : { tone: "ok", text: `${version.assets.length} görsel barındırıldı, tüm referanslar eşleşti.` },
    version.placeholders.length
      ? { tone: "warn", text: `${version.placeholders.length} placeholder bulundu; test gönderiminde ham gider.` }
      : { tone: "ok", text: "Placeholder yok." },
    /charset=.*utf-8|<meta[^>]+charset=["']?utf-8/i.test(version.html)
      ? { tone: "ok", text: "charset UTF-8 tanımlı." }
      : { tone: "warn", text: "charset UTF-8 tanımlı değil; Türkçe karakterler bozulabilir." },
  ];
  if (live) {
    const badLinks = live.links.filter((l) => !l.ok);
    const badImages = live.images.filter((i) => !i.ok);
    checks.push(
      badLinks.length
        ? { tone: "err", text: `${badLinks.length} / ${live.links.length} link yanıt vermiyor.` }
        : { tone: "ok", text: `${live.links.length} link kontrol edildi, hepsi çalışıyor.` },
      badImages.length
        ? { tone: "err", text: `${badImages.length} / ${live.images.length} görsel yüklenemiyor.` }
        : { tone: "ok", text: `${live.images.length} görsel erişilebilir, toplam ${(live.totalImageBytes / 1024).toFixed(0)} KB.` },
      live.altMissing.length
        ? { tone: "warn", text: `${live.altMissing.length} görselde alt metni yok.` }
        : { tone: "ok", text: "Tüm görsellerde alt metni var." },
    );
    if (live.totalImageBytes > 1024 * 1024) checks.push({ tone: "warn", text: "Görseller 1 MB'ı aşıyor; mobilde yavaş açılır." });
  }
  const counts = { ok: 0, warn: 0, err: 0 };
  for (const c of checks) counts[c.tone]++;

  const panel = (
    <>
      <Section
        title="Kontroller"
        action={
          <form action={runChecksAction}>
            <input type="hidden" name="versionId" value={version.id} />
            <input type="hidden" name="projectId" value={project.id} />
            <Button type="submit" variant="outline" size="xs">
              <RefreshCwIcon data-icon="inline-start" />
              {live ? "Yeniden" : "Linkleri kontrol et"}
            </Button>
          </form>
        }
      >
        <ul className="flex flex-col gap-2">
          {checks.map((c, i) => (
            <li key={i} className="flex gap-2">
              <Dot tone={c.tone} />
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
        {live && (live.links.some((l) => !l.ok) || live.images.some((i) => !i.ok) || live.altMissing.length > 0) && (
          <ul className="mt-3 flex flex-col gap-1 font-mono text-[11px]">
            {live.links
              .filter((l) => !l.ok)
              .map((l) => (
                <li key={l.url} className="text-err truncate" title={l.error ?? String(l.status)}>
                  {l.status ?? "✕"} {l.url}
                </li>
              ))}
            {live.images
              .filter((i) => !i.ok)
              .map((i) => (
                <li key={i.url} className="text-err truncate">
                  {i.status ?? "✕"} {i.url}
                </li>
              ))}
            {live.altMissing.map((src, i) => (
              <li key={i} className="text-warn truncate">
                alt yok: {src.split("/").pop()}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {version.subject && (
        <Section title="Konu (title)">
          <p className="text-muted-foreground">{version.subject}</p>
        </Section>
      )}

      {version.placeholders.length > 0 && (
        <Section title="Placeholder'lar">
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
        <Section title="Eşleşmeyen görseller">
          <ul className="flex flex-col gap-1 font-mono text-[11px] text-err">
            {version.missingAssets.map((m) => (
              <li key={m} className="truncate">
                {m}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Görseller · ${version.assets.length}`}>
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

      <Section title="Test gönderimi">
        <SendPanel
          versionId={version.id}
          projectId={project.id}
          defaultSubject={version.subject ?? project.name}
          senders={senders.map((s) => ({ id: s.id, name: s.name, fromEmail: s.fromEmail, isDefault: s.isDefault }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name, count: g._count.recipients }))}
        />
        <p className="text-muted-foreground mt-2">
          Gönderici ve grupları{" "}
          <Link href="/settings" className="underline underline-offset-2">
            Ayarlar
          </Link>
          &apos;dan yönet.
        </p>
      </Section>

      {sends.length > 0 && (
        <Section title="Gönderim geçmişi">
          <ul className="flex flex-col gap-3">
            {sends.map((s) => (
              <li key={s.id}>
                <div className="flex items-center gap-2">
                  <Dot tone={s.status === "SENT" ? "ok" : s.status === "FAILED" ? "err" : "warn"} />
                  <span className="truncate flex-1">{s.subject}</span>
                  <time className="text-muted-foreground text-xs" dateTime={s.createdAt.toISOString()}>
                    {s.createdAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
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
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/" aria-label="Projelere dön" />}>
            <ArrowLeftIcon />
          </Button>
          <h1 className="font-medium truncate min-w-0">{project.name}</h1>
          <Badge variant="secondary" className="font-mono hidden sm:inline-flex">
            {version.sourceKind}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <CountBadges counts={counts} />
            <ShareDialog
              projectId={project.id}
              shares={shares.map((s) => ({ id: s.id, url: shareUrl(s.token), createdAt: s.createdAt.toISOString(), views: s.views }))}
            />
            <nav className="flex items-center gap-0.5" aria-label="Versiyonlar">
              {project.versions.map((x) => (
                <Button
                  key={x.id}
                  variant={x.id === version.id ? "default" : "ghost"}
                  size="xs"
                  className="font-mono"
                  nativeButton={false}
                  render={<Link href={`/p/${project.id}?v=${x.number}`} aria-current={x.id === version.id ? "page" : undefined} />}
                >
                  v{x.number}
                </Button>
              ))}
            </nav>
          </div>
        </div>
        <Preview src={`/api/versions/${version.id}/html`} />
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
