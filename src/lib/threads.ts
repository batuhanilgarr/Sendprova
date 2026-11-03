/** Comment thread shapes shared by server pages and client components. */

export interface ThreadComment {
  id: string;
  body: string;
  authorName: string;
  byUserId?: string | null;
  createdAt: string;
}

export interface Thread extends ThreadComment {
  n: number;
  x: number;
  y: number;
  device: string | null;
  resolvedAt: string | null;
  replies: ThreadComment[];
}

export interface RawThread {
  id: string;
  body: string;
  authorName: string;
  byUserId?: string | null;
  createdAt: string | Date;
  x: number | null;
  y: number | null;
  device: string | null;
  resolvedAt: string | Date | null;
  replies: { id: string; body: string; authorName: string; byUserId?: string | null; createdAt: string | Date }[];
}

export function toThreads(raw: RawThread[]): Thread[] {
  return raw.map((t, i) => ({
    id: t.id,
    n: i + 1,
    body: t.body,
    authorName: t.authorName,
    byUserId: t.byUserId ?? null,
    createdAt: new Date(t.createdAt).toISOString(),
    x: t.x ?? 0,
    y: t.y ?? 0,
    device: t.device,
    resolvedAt: t.resolvedAt ? new Date(t.resolvedAt).toISOString() : null,
    replies: t.replies.map((r) => ({
      id: r.id,
      body: r.body,
      authorName: r.authorName,
      byUserId: r.byUserId ?? null,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
  }));
}
