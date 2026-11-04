import { db } from "./db";

export interface Brand {
  name: string;
  logoUrl: string | null;
  color: string | null;
  hidePoweredBy: boolean;
}

/** Agency brand for a workspace, falling back to the owner's name. */
export async function brandForWorkspace(workspaceId: string): Promise<Brand> {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, include: { owner: { select: { name: true } } } });
  return {
    name: ws?.brandName || ws?.owner?.name || ws?.name || "Sendprova",
    logoUrl: ws?.brandLogoUrl ?? null,
    color: ws?.brandColor ?? null,
    hidePoweredBy: ws?.hidePoweredBy ?? false,
  };
}

/** Converts a hex color to the oklch-free CSS the theme expects: we just override --primary with the hex. */
export function brandStyle(brand: Brand): React.CSSProperties | undefined {
  if (!brand.color) return undefined;
  return { "--primary": brand.color, "--ring": brand.color, "--sidebar-primary": brand.color } as React.CSSProperties;
}
