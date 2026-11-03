import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Preview } from "../../../components/preview";
import { SendPanel } from "../../../components/send-panel";
import { db, defaultWorkspace } from "../../../lib/db";
import { ensureDefaultSender } from "../../../lib/mailer";

const GMAIL_CLIP_BYTES = 102 * 1024;

export default function ProjectPage({ params, searchParams }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Yükleniyor…</div>}>
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
  const [senders, groups, sends] = await Promise.all([
    db.senderProfile.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } }),
    db.recipientGroup.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { recipients: true } } } }),
    db.testSend.findMany({
      where: { versionId: version.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { deliveries: { orderBy: { email: "asc" } }, sender: { select: { name: true } } },
    }),
  ]);
  const kb = version.htmlBytes / 1024;
  const clip = version.htmlBytes > GMAIL_CLIP_BYTES;

  const checks: { tone: "ok" | "warn" | "err"; text: string }[] = [
    clip
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

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-11 shrink-0 border-b border-border bg-bg-elevated flex items-center gap-3 px-4">
          <Link href="/" className="text-fg-muted hover:text-fg">
            ←
          </Link>
          <h1 className="font-medium truncate">{project.name}</h1>
          <span className="rounded-md bg-bg-sunken border border-border px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
            {version.sourceKind}
          </span>
          <nav className="ml-auto flex items-center gap-1" aria-label="Versiyonlar">
            {project.versions.map((x) => (
              <Link
                key={x.id}
                href={`/p/${project.id}?v=${x.number}`}
                aria-current={x.id === version.id ? "page" : undefined}
                className="px-2 py-0.5 rounded-md font-mono text-[11px] text-fg-muted aria-[current]:bg-accent aria-[current]:text-accent-fg"
              >
                v{x.number}
              </Link>
            ))}
          </nav>
        </div>
        <Preview src={`/api/versions/${version.id}/html`} />
      </div>

      <aside className="w-80 shrink-0 border-l border-border bg-bg-elevated overflow-auto">
        <Section title="Kontroller">
          <ul className="flex flex-col gap-2">
            {checks.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${c.tone === "ok" ? "bg-ok" : c.tone === "warn" ? "bg-warn" : "bg-err"}`}
                  aria-label={c.tone}
                />
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </Section>

        {version.subject && (
          <Section title="Konu (title)">
            <p className="text-fg-muted">{version.subject}</p>
          </Section>
        )}

        {version.placeholders.length > 0 && (
          <Section title="Placeholder'lar">
            <ul className="flex flex-wrap gap-1">
              {version.placeholders.map((p) => (
                <li key={p} className="font-mono text-[11px] rounded-md bg-bg-sunken border border-border px-1.5 py-0.5">
                  {p}
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
          <ul className="grid grid-cols-4 gap-1.5">
            {version.assets
              .filter((a) => a.mime.startsWith("image/"))
              .map((a) => (
                <li key={a.id} className="aspect-square rounded-md border border-border bg-bg-sunken overflow-hidden" title={`${a.path} · ${(a.bytes / 1024).toFixed(1)} KB`}>
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
          <p className="text-fg-subtle mt-2">
            Gönderici ve grupları <Link href="/settings" className="underline">Ayarlar</Link>&apos;dan yönet.
          </p>
        </Section>

        {sends.length > 0 && (
          <Section title="Gönderim geçmişi">
            <ul className="flex flex-col gap-3">
              {sends.map((s) => (
                <li key={s.id}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${s.status === "SENT" ? "bg-ok" : s.status === "FAILED" ? "bg-err" : "bg-warn"}`} />
                    <span className="truncate flex-1">{s.subject}</span>
                    <time className="text-fg-subtle text-xs" dateTime={s.createdAt.toISOString()}>
                      {s.createdAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  <ul className="mt-1 ml-4 flex flex-col gap-0.5 font-mono text-[11px]">
                    {s.deliveries.map((d) => (
                      <li key={d.id} className={d.status === "FAILED" ? "text-err" : "text-fg-muted"} title={d.error ?? d.messageId ?? ""}>
                        {d.status === "SENT" ? "✓" : d.status === "FAILED" ? "✕" : "…"} {d.email}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-4 py-3">
      <h2 className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle mb-2">{title}</h2>
      {children}
    </section>
  );
}
