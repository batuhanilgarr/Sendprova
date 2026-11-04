import { renderPreflightPdf, safeFileName } from "@/lib/preflight-pdf";
import { requireVersionAccess } from "@/lib/session";

/** Pre-flight report as PDF: score, every finding, approval state and comment count. */
export async function GET(_req: Request, ctx: RouteContext<"/api/versions/[id]/preflight.pdf">) {
  const { id } = await ctx.params;
  const access = await requireVersionAccess(id);
  if (!access.ok) return access.response;
  const { pdf, version } = await renderPreflightPdf(id);
  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${safeFileName(version.project.name)}-v${version.number}-preflight.pdf"`,
      "cache-control": "no-store",
    },
  });
}
