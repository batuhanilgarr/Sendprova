import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Member details" };

type Params = PageProps<"/admin/users/[id]">["params"];

export default function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 flex flex-col gap-8">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Params }) {
  await connection();
  await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      workspace: {
        include: {
          projects: { orderBy: { updatedAt: "desc" }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } },
          ledger: { orderBy: { createdAt: "desc" }, take: 50 },
          senders: true,
        },
      },
    },
  });
  if (!user) notFound();
  const ws = user.workspace;

  const sends = ws
    ? await db.testSend.findMany({
        where: { version: { project: { workspaceId: ws.id } } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { deliveries: true, version: { include: { project: { select: { name: true } } } } },
      })
    : [];

  return (
    <>
      <div>
        <Link href="/admin" className="text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2 flex items-center gap-2">
          {user.name || user.email}
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role ?? "user"}</Badge>
          {user.banned && <Badge variant="destructive">suspended</Badge>}
        </h1>
        <p className="text-muted-foreground font-mono text-xs">{user.email}</p>
      </div>

      {ws && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Credits" value={ws.credits} />
          <Stat label="Projects" value={ws.projects.length} />
          <Stat label="Sends" value={sends.length} />
          <Stat label="Sender profiles" value={ws.senders.length} />
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium mb-3">Projects</h2>
        <ul className="rounded-xl border bg-card divide-y">
          {ws?.projects.length === 0 && <li className="px-4 py-3 text-muted-foreground">No projects.</li>}
          {ws?.projects.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link href={`/app/p/${p.id}`} className="flex-1 truncate font-medium hover:underline underline-offset-2">
                {p.name}
              </Link>
              <span className="text-muted-foreground font-mono text-xs">v{p.versions[0]?.number ?? 0}</span>
              <time className="text-muted-foreground text-xs">{p.updatedAt.toLocaleDateString("en-US")}</time>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Sends</h2>
        <ul className="rounded-xl border bg-card divide-y">
          {sends.length === 0 && <li className="px-4 py-3 text-muted-foreground">No sends yet.</li>}
          {sends.map((s) => {
            const sent = s.deliveries.filter((d) => d.status === "SENT").length;
            return (
              <li key={s.id} className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`size-2 rounded-full ${s.status === "SENT" ? "bg-ok" : s.status === "FAILED" ? "bg-err" : "bg-warn"}`} />
                  <span className="flex-1 truncate">{s.subject}</span>
                  <span className="text-muted-foreground text-xs truncate max-w-40">{s.version.project.name}</span>
                  <span className="font-mono text-xs">
                    {sent}/{s.deliveries.length}
                  </span>
                  <time className="text-muted-foreground text-xs whitespace-nowrap">{s.createdAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</time>
                </div>
                <div className="ml-5 mt-1 text-muted-foreground font-mono text-[11px] truncate">{s.deliveries.map((d) => d.email).join(", ")}</div>
              </li>
            );
          })}
        </ul>
      </section>

      {ws && (
        <section>
          <h2 className="text-sm font-medium mb-3">Credit activity</h2>
          <ul className="rounded-xl border bg-card divide-y">
            {ws.ledger.length === 0 && <li className="px-4 py-3 text-muted-foreground">No activity.</li>}
            {ws.ledger.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`font-mono w-14 text-right ${l.delta > 0 ? "text-ok" : "text-err"}`}>
                  {l.delta > 0 ? "+" : ""}
                  {l.delta}
                </span>
                <span className="flex-1 truncate">{l.reason}</span>
                <time className="text-muted-foreground text-xs whitespace-nowrap">{l.createdAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1 font-mono">{value}</div>
    </div>
  );
}
