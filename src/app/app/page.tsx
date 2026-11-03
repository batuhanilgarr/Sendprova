import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DropZone } from "@/components/drop-zone";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { currentWorkspace } from "@/lib/session";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni mailing</h1>
        <p className="text-muted-foreground mt-1 mb-5">Bırak, önizle, kontrol et, gönder.</p>
        <DropZone />
      </section>
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Projeler</h2>
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
          <ProjectList />
        </Suspense>
      </section>
    </div>
  );
}

async function ProjectList() {
  await connection();
  const workspace = await currentWorkspace();
  const projects = await db.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      versions: { orderBy: { number: "desc" }, take: 1, select: { number: true, htmlBytes: true, createdAt: true, sourceKind: true } },
    },
  });
  if (projects.length === 0) return <p className="text-muted-foreground">Henüz proje yok.</p>;
  return (
    <ul className="divide-y rounded-xl border bg-card overflow-hidden">
      {projects.map((p) => {
        const v = p.versions[0];
        return (
          <li key={p.id}>
            <Link href={`/app/p/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
              <span className="flex-1 min-w-0 truncate font-medium">{p.name}</span>
              {v && (
                <>
                  <Badge variant="secondary" className="hidden sm:inline-flex font-mono">
                    {v.sourceKind}
                  </Badge>
                  <span className="text-muted-foreground font-mono text-xs">v{v.number}</span>
                  <span className="hidden sm:inline text-muted-foreground font-mono text-xs">{(v.htmlBytes / 1024).toFixed(1)} KB</span>
                  <time className="text-muted-foreground text-xs" dateTime={v.createdAt.toISOString()}>
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
