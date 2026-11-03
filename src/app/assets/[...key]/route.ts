import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_ASSET_ROOT, mimeFor } from "../../../lib/storage";

/** Serves assets written by the `local` storage driver. */
export async function GET(_req: Request, ctx: RouteContext<"/assets/[...key]">) {
  const { key } = await ctx.params;
  const file = path.resolve(LOCAL_ASSET_ROOT, ...key.map(decodeURIComponent));
  if (!file.startsWith(LOCAL_ASSET_ROOT + path.sep)) return new Response("Forbidden", { status: 403 });
  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": mimeFor(file),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
