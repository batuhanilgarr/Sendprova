import { db } from "@/lib/db";
import { detectClient, GIF_1X1 } from "@/lib/opens";

/** Open-tracking pixel. Always returns a GIF; recording failures never surface to the client. */
export async function GET(req: Request, ctx: RouteContext<"/t/o/[file]">) {
  const { file } = await ctx.params;
  const id = file.replace(/\.gif$/i, "");
  const ua = req.headers.get("user-agent");
  try {
    // Keep the first open's time and client; later opens only bump the counter.
    const existing = await db.delivery.findUnique({ where: { id }, select: { openedAt: true } });
    if (existing) {
      await db.delivery.update({
        where: { id },
        data: existing.openedAt
          ? { openCount: { increment: 1 } }
          : { openCount: { increment: 1 }, openedAt: new Date(), openClient: detectClient(ua), openUserAgent: ua?.slice(0, 300) ?? null },
      });
    }
  } catch {
    // unknown id or race: ignore
  }
  return new Response(new Uint8Array(GIF_1X1), {
    headers: {
      "content-type": "image/gif",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      pragma: "no-cache",
      expires: "0",
    },
  });
}
