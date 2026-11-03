import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Preview } from "@/components/preview";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { resolveShare } from "@/lib/share";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

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
  await db.shareLink.update({ where: { id: share.id }, data: { views: { increment: 1 } } });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="min-h-11 shrink-0 border-b bg-background flex items-center gap-2 px-3 sm:px-4 py-1.5">
        <h1 className="font-medium truncate min-w-0">{project.name}</h1>
        <Badge variant="secondary" className="font-mono">
          v{version.number}
        </Badge>
        <span className="ml-auto text-muted-foreground text-xs hidden sm:inline">
          {version.createdAt.toLocaleDateString("en-US")} · read-only preview
        </span>
      </div>
      <Preview src={`/api/share/${token}/html`} />
    </div>
  );
}
