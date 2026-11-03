import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Raw HTML of a version, rendered inside the sandboxed preview iframe. */
export async function GET(_req: Request, ctx: RouteContext<"/api/versions/[id]/html">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const version = await db.version.findUnique({
    where: { id, ...(session.user.role === "admin" ? {} : { project: { workspace: { ownerId: session.user.id } } }) },
    select: { html: true },
  });
  if (!version) return new Response("Not found", { status: 404 });
  return new Response(version.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "script-src 'none'; frame-ancestors 'self'",
      "cache-control": "no-store",
    },
  });
}
