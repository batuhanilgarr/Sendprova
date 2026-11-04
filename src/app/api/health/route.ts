import { db } from "@/lib/db";

/** Liveness + database check for load balancers and Docker HEALTHCHECK. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up" });
  } catch (err) {
    return Response.json({ ok: false, db: "down", error: err instanceof Error ? err.message : String(err) }, { status: 503 });
  }
}
