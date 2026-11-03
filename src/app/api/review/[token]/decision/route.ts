import { decisionSchema, recordDecision } from "@/lib/review";

export async function POST(req: Request, ctx: RouteContext<"/api/review/[token]/decision">) {
  const { token } = await ctx.params;
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const approval = await recordDecision(token, parsed.data);
    return Response.json(approval, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
