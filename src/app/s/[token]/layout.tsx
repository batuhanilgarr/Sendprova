import { connection } from "next/server";
import { Suspense } from "react";
import { BrandHeader } from "@/components/brand-header";
import { brandForWorkspace, brandStyle } from "@/lib/branding";
import { db } from "@/lib/db";

/** Client-facing chrome: the agency's brand, not the app navigation. */
export default function ShareLayout({ children, params }: LayoutProps<"/s/[token]">) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Branded params={params}>{children}</Branded>
    </Suspense>
  );
}

async function Branded({ children, params }: { children: React.ReactNode; params: LayoutProps<"/s/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const share = await db.shareLink.findUnique({ where: { token }, include: { project: { include: { client: true } } } });
  const brand = share ? await brandForWorkspace(share.project.workspaceId) : { name: "Sendprova", logoUrl: null, color: null, hidePoweredBy: false };
  const portalHref = share?.project.client?.portalToken ? `/c/${share.project.client.portalToken}` : undefined;
  return (
    <div className="flex-1 flex flex-col min-h-0" style={brandStyle(brand)}>
      <BrandHeader brand={brand} subtitle="review" homeHref={portalHref} />
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  );
}
