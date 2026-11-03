import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DropZone } from "../components/drop-zone";
import { db } from "../lib/db";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni mailing</h1>
        <p className="text-fg-muted mt-1 mb-5">Bırak, önizle, kontrol et, gönder.</p>
        <DropZone />
      </section>
      <section>
        <h2 className="text-sm font-medium text-fg-muted mb-3">Projeler</h2>
        <Suspense fallback={<p className="text-fg-subtle">Yükleniyor…</p>}>
          <ProjectList />
        </Suspense>
      </section>
    </div>
  );
}

async function ProjectList() {
  await connection();
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { versions: { orderBy: { number: "desc" }, take: 1, select: { number: true, htmlBytes: true, createdAt: true } } },
  });
  if (projects.length === 0) return <p className="text-fg-subtle">Henüz proje yok.</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-bg-elevated overflow-hidden">
      {projects.map((p) => {
        const v = p.versions[0];
        return (
          <li key={p.id}>
            <Link href={`/p/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-bg-sunken transition-colors">
              <span className="flex-1 truncate font-medium">{p.name}</span>
              {v && (
                <>
                  <span className="text-fg-subtle font-mono text-xs">v{v.number}</span>
                  <span className="text-fg-subtle font-mono text-xs">{(v.htmlBytes / 1024).toFixed(1)} KB</span>
                  <time className="text-fg-subtle text-xs" dateTime={v.createdAt.toISOString()}>
                    {v.createdAt.toLocaleDateString("tr-TR")}
                  </time>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
