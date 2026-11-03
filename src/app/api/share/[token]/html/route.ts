import { resolveShare } from "@/lib/share";

/** Raw HTML of the latest version behind a share token. */
export async function GET(_req: Request, ctx: RouteContext<"/api/share/[token]/html">) {
  const { token } = await ctx.params;
  const resolved = await resolveShare(token);
  if (!resolved) return new Response("Not found", { status: 404 });
  return new Response(resolved.version.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "script-src 'none'; frame-ancestors 'self'",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
