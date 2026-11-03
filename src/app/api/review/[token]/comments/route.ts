import { addReviewerComment, commentSchema, listComments } from "@/lib/review";
import { resolveShare } from "@/lib/share";

export async function GET(_req: Request, ctx: RouteContext<"/api/review/[token]/comments">) {
  const { token } = await ctx.params;
  const resolved = await resolveShare(token);
  if (!resolved) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ versionId: resolved.version.id, comments: await listComments(resolved.version.id) });
}

export async function POST(req: Request, ctx: RouteContext<"/api/review/[token]/comments">) {
  const { token } = await ctx.params;
  const parsed = commentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const comment = await addReviewerComment(token, parsed.data);
    return Response.json(comment, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
