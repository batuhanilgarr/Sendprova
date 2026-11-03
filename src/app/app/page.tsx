import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DropZone } from "@/components/drop-zone";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/review-workbench";
import { db } from "@/lib/db";
import { currentWorkspace } from "@/lib/session";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">New mailing</h1>
        <p className="text-muted-foreground mt-1 mb-5">Drop, preview, check, send.</p>
        <DropZone />
      </section>
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Projects</h2>
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
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
      client: { select: { id: true, name: true, color: true } },
    },
  });
  if (projects.length === 0) return <p className="text-muted-foreground">No projects yet.</p>;

  // Group by client; projects without a client come last.
  const groups = new Map<string, { name: string; color: string | null; items: typeof projects }>();
  for (const p of projects) {
    const key = p.client?.id ?? "_none";
    if (!groups.has(key)) groups.set(key, { name: p.client?.name ?? "No client", color: p.client?.color ?? null, items: [] });
    groups.get(key)!.items.push(p);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "_none" ? 1 : b === "_none" ? -1 : 0));

  return (
    <div className="flex flex-col gap-6">
      {ordered.map(([key, g]) => (
        <div key={key}>
          {groups.size > 1 && (
            <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full border" style={{ background: g.color ?? "transparent" }} aria-hidden />
              {g.name}
            </h3>
          )}
          <ProjectRows projects={g.items} />
        </div>
      ))}
    </div>
  );
}

function ProjectRows({ projects }: { projects: { id: string; name: string; status: string; versions: { number: number; htmlBytes: number; createdAt: Date; sourceKind: string }[] }[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card overflow-hidden">
      {projects.map((p) => {
        const v = p.versions[0];
        return (
          <li key={p.id}>
            <Link href={`/app/p/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
              <span className="flex-1 min-w-0 truncate font-medium">{p.name}</span>
              <StatusBadge status={p.status} />
              {v && (
                <>
                  <Badge variant="secondary" className="hidden sm:inline-flex font-mono">
                    {v.sourceKind}
                  </Badge>
                  <span className="text-muted-foreground font-mono text-xs">v{v.number}</span>
                  <span className="hidden sm:inline text-muted-foreground font-mono text-xs">{(v.htmlBytes / 1024).toFixed(1)} KB</span>
                  <time className="text-muted-foreground text-xs" dateTime={v.createdAt.toISOString()}>
                    {v.createdAt.toLocaleDateString("en-US")}
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
