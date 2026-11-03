"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type AdminState = { ok?: string; error?: string } | null;

const creditSchema = z.object({
  workspaceId: z.string().min(1),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Amount cannot be 0"),
  reason: z.string().min(1, "Reason is required"),
});

export async function adjustCredits(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = creditSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { workspaceId, delta, reason } = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
      if (ws.credits + delta < 0) throw new Error(`Balance would go negative (current: ${ws.credits}).`);
      await tx.workspace.update({ where: { id: workspaceId }, data: { credits: { increment: delta } } });
      await tx.creditLedger.create({ data: { workspaceId, delta, reason, byUserId: admin.id } });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/admin");
  return { ok: `${delta > 0 ? "+" : ""}${delta} credits applied.` };
}

export async function setBanned(form: FormData) {
  const admin = await requireAdmin();
  const userId = String(form.get("userId"));
  const banned = form.get("banned") === "1";
  if (userId === admin.id) return;
  await db.user.update({
    where: { id: userId },
    data: { banned, banReason: banned ? "Suspended by an administrator" : null, banExpires: null },
  });
  if (banned) await db.session.deleteMany({ where: { userId } });
  revalidatePath("/admin");
}

export async function setRole(form: FormData) {
  const admin = await requireAdmin();
  const userId = String(form.get("userId"));
  const role = form.get("role") === "admin" ? "admin" : "user";
  if (userId === admin.id) return;
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}
