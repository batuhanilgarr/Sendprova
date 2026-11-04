import type { Metadata } from "next";
import { CheckCircle2Icon, MessageSquareIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BrandHeader } from "@/components/brand-header";
import { StatusBadge } from "@/components/review-workbench";
import { Badge } from "@/components/ui/badge";
import { brandForWorkspace, brandStyle } from "@/lib/branding";
import { db } from "@/lib/db";
import { newToken } from "@/lib/share";

export const metadata: Metadata = { title: "Your projects", robots: { index: false, follow: false } };

type Params = PageProps<"/c/[token]">["params"];

export default function PortalPage({ params }: PageProps<"/c/[token]">) {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <Portal params={params} />
    </Suspense>
  );
}

/**
 * Client portal: every project for one client, its status, last decision and
 * open comments, each linking to its review page. No account needed.
 */
async function Portal({ params }: { params: Params }) {
  await connection();
  const { token } = await params;
  const client = await db.client.findUnique({
    where: { portalToken: token },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          versions: { orderBy: { number: "desc" }, take: 1, include: { approvals: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { comments: { where: { resolvedAt: null, parentId: null } } } } } },
          shareLinks: { where: { revokedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!client) notFound();
  const brand = await brandForWorkspace(client.workspaceId);

  // Every project needs a review link for the portal to be useful; create missing ones.
  const links = new Map<string, string>();
  for (const p of client.projects) {
    let share = p.shareLinks[0];
    if (!share) share = await db.shareLink.create({ data: { projectId: p.id, token: newToken() } });
    links.set(p.id, share.token);
  }

  const waiting = client.projects.filter((p) => p.status === "IN_REVIEW").length;

  return (
    <div className="flex-1 flex flex-col min-h-0" style={brandStyle(brand)}>
      <BrandHeader brand={brand} subtitle="client portal" />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground mt-1">
              {client.projects.length} project{client.projects.length === 1 ? "" : "s"} with {brand.name}
              {waiting > 0 && (
                <>
                  {" · "}
                  <span className="text-primary font-medium">
                    {waiting} waiting for your review
                  </span>
                </>
              )}
            </p>
          </div>

          {client.projects.length === 0 ? (
            <p className="text-muted-foreground">Nothing shared yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card overflow-hidden">
              {client.projects.map((p) => {
                const v = p.versions[0];
                const a = v?.approvals[0];
                const open = v?._count.comments ?? 0;
                return (
                  <li key={p.id}>
                    <Link href={`/s/${links.get(p.id)}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/60 transition-colors">
                      <span className="basis-full sm:basis-auto sm:flex-1 min-w-0 truncate font-medium">{p.name}</span>
                      <StatusBadge status={p.status} />
                      {v && (
                        <Badge variant="secondary" className="font-mono">
                          v{v.number}
                        </Badge>
                      )}
                      {open > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquareIcon className="size-3" /> {open}
                        </span>
                      )}
                      {a && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={a.note ?? ""}>
                          {a.decision === "APPROVED" ? <CheckCircle2Icon className="size-3 text-ok" /> : <XCircleIcon className="size-3 text-warn" />}
                          {a.reviewerName}
                        </span>
                      )}
                      <time className="text-xs text-muted-foreground" dateTime={p.updatedAt.toISOString()}>
                        {p.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-muted-foreground text-xs">Open a project to preview it on every device, pin comments and approve. This link is private to {client.name}; share it only with your team.</p>
        </div>
      </main>
    </div>
  );
}
