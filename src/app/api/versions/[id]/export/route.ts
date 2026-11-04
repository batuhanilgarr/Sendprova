import { db } from "@/lib/db";
import { ESP_PROFILES, exportHtml, type EspProfile } from "@/lib/export";
import { safeFileName } from "@/lib/preflight-pdf";
import { requireVersionAccess } from "@/lib/session";

/**
 * GET ?profile=mailchimp&inline=1[&download=1]
 * Returns the ESP-ready HTML; JSON with mapping details when Accept: application/json.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/versions/[id]/export">) {
  const { id } = await ctx.params;
  const access = await requireVersionAccess(id);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const profile = (url.searchParams.get("profile") ?? "generic") as EspProfile;
  if (!(profile in ESP_PROFILES)) return new Response("Unknown profile", { status: 400 });
  const inlineCss = url.searchParams.get("inline") !== "0";

  const version = await db.version.findUniqueOrThrow({ where: { id }, include: { project: { select: { name: true } } } });
  const result = exportHtml(version.html, { profile, inlineCss });

  if (req.headers.get("accept")?.includes("application/json")) {
    return Response.json({ ...result, bytes: Buffer.byteLength(result.html, "utf8") });
  }
  const name = `${safeFileName(version.project.name)}-v${version.number}-${profile}.html`;
  return new Response(result.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `${url.searchParams.get("download") ? "attachment" : "inline"}; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
