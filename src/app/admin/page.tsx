import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { setBanned, setRole } from "./actions";
import { CreditForm } from "./credit-form";

export const metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  await connection();
  const admin = await requireAdmin();
  // Server component rendered per request (connection() above), so "now" is fine here.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [users, totals, sends30, deliveries30, recentLedger] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        workspace: {
          include: {
            _count: { select: { projects: true } },
          },
        },
      },
    }),
    Promise.all([db.user.count(), db.project.count(), db.testSend.count(), db.delivery.count({ where: { status: "SENT" } })]),
    db.testSend.count({ where: { createdAt: { gte: since } } }),
    db.delivery.count({ where: { status: "SENT", sentAt: { gte: since } } }),
    db.creditLedger.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { workspace: { include: { owner: { select: { email: true } } } } } }),
  ]);

  // Per-workspace send and delivery counts in one pass.
  const sendStats = await db.testSend.groupBy({
    by: ["versionId"],
    _count: { _all: true },
  });
  const versionToWorkspace = new Map(
    (await db.version.findMany({ where: { id: { in: sendStats.map((s) => s.versionId) } }, select: { id: true, project: { select: { workspaceId: true } } } })).map(
      (v) => [v.id, v.project.workspaceId],
    ),
  );
  const sendsByWorkspace = new Map<string, number>();
  for (const s of sendStats) {
    const ws = versionToWorkspace.get(s.versionId);
    if (ws) sendsByWorkspace.set(ws, (sendsByWorkspace.get(ws) ?? 0) + s._count._all);
  }

  const [userCount, projectCount, sendCount, deliveredCount] = totals;

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Members" value={userCount} />
        <Stat label="Projects" value={projectCount} />
        <Stat label="Test sends" value={sendCount} hint={`last 30 days: ${sends30}`} />
        <Stat label="Emails delivered" value={deliveredCount} hint={`last 30 days: ${deliveries30}`} />
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Members</h2>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium text-right">Projects</th>
                <th className="px-4 py-2 font-medium text-right">Sends</th>
                <th className="px-4 py-2 font-medium text-right">Credits</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className={u.banned ? "opacity-60" : ""}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{u.name || "—"}</div>
                    <div className="text-muted-foreground font-mono text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role ?? "user"}</Badge>
                    {u.banned && (
                      <Badge variant="destructive" className="ml-1">
                        suspended
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{u.workspace?._count.projects ?? 0}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{u.workspace ? (sendsByWorkspace.get(u.workspace.id) ?? 0) : 0}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{u.workspace?.credits ?? 0}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{u.createdAt.toLocaleDateString("en-US")}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-2 min-w-80">
                      {u.workspace && <CreditForm workspaceId={u.workspace.id} />}
                      {u.id !== admin.id && (
                        <div className="flex gap-1">
                          <form action={setBanned}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="banned" value={u.banned ? "0" : "1"} />
                            <Button type="submit" size="xs" variant={u.banned ? "outline" : "destructive"}>
                              {u.banned ? "Unsuspend" : "Suspend"}
                            </Button>
                          </form>
                          <form action={setRole}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="role" value={u.role === "admin" ? "user" : "admin"} />
                            <Button type="submit" size="xs" variant="outline">
                              {u.role === "admin" ? "Remove admin" : "Make admin"}
                            </Button>
                          </form>
                          {u.workspace && (
                            <Button size="xs" variant="ghost" nativeButton={false} render={<Link href={`/admin/users/${u.id}`} />}>
                              Details
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Recent credit activity</h2>
        <ul className="rounded-xl border bg-card divide-y">
          {recentLedger.length === 0 && <li className="px-4 py-3 text-muted-foreground">No activity yet.</li>}
          {recentLedger.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`font-mono w-14 text-right ${l.delta > 0 ? "text-ok" : "text-err"}`}>
                {l.delta > 0 ? "+" : ""}
                {l.delta}
              </span>
              <span className="flex-1 truncate">{l.reason}</span>
              <span className="text-muted-foreground font-mono text-xs truncate max-w-48">{l.workspace.owner?.email ?? l.workspace.name}</span>
              <time className="text-muted-foreground text-xs whitespace-nowrap" dateTime={l.createdAt.toISOString()}>
                {l.createdAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1 font-mono">{value}</div>
      {hint && <div className="text-muted-foreground text-xs mt-0.5">{hint}</div>}
    </div>
  );
}
