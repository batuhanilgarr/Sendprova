import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Signed-in user or redirect to /login. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.banned) redirect("/login?banned=1");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/app");
  return user;
}

/** The signed-in user's workspace (created at sign-up; recreated here if missing). */
export async function currentWorkspace() {
  const user = await requireUser();
  const ws = await db.workspace.findUnique({ where: { ownerId: user.id } });
  if (ws) return ws;
  return db.workspace.create({ data: { ownerId: user.id, name: user.name || "My workspace", slug: `ws_${user.id}` } });
}

/** Throws unless the project belongs to the current user's workspace. Admins may access any project. */
export async function requireProjectAccess(projectId: string) {
  const user = await requireUser();
  const project = await db.project.findUnique({ where: { id: projectId }, include: { workspace: true } });
  if (!project) throw new Error("Project not found");
  if (user.role !== "admin" && project.workspace.ownerId !== user.id) throw new Error("You do not have access to this project");
  return { user, project };
}

/** Route-handler guard: the version must belong to the signed-in user's workspace (admins see all). */
export async function requireVersionAccess(versionId: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  const session = await getSession();
  if (!session) return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  const version = await db.version.findUnique({
    where: { id: versionId, ...(session.user.role === "admin" ? {} : { project: { workspace: { ownerId: session.user.id } } }) },
    select: { id: true },
  });
  if (!version) return { ok: false, response: new Response("Not found", { status: 404 }) };
  return { ok: true };
}
