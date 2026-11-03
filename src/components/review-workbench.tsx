"use client";

import { CheckCircle2Icon, MessageSquareIcon, XCircleIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommentThread } from "@/components/comment-thread";
import { toThreads, type RawThread, type Thread } from "@/lib/threads";
import { Preview, type DeviceKey, type PreviewPin } from "@/components/preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Reviewer {
  name: string;
  email: string;
}

const STORAGE_KEY = "sendprova.reviewer";

/**
 * Public review page body: preview with pins, reviewer identity, comment
 * threads and the approve / request-changes decision. No account needed.
 */
export function ReviewWorkbench({
  token,
  src,
  projectName,
  versionNumber,
  status,
  initialThreads,
  lastDecision,
}: {
  token: string;
  src: string;
  projectName: string;
  versionNumber: number;
  status: string;
  initialThreads: Thread[];
  lastDecision: { decision: string; reviewerName: string; createdAt: string; note: string | null } | null;
}) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [reviewer, setReviewer] = useState<Reviewer | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number; device: DeviceKey } | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [decisionOpen, setDecisionOpen] = useState<"APPROVED" | "CHANGES_REQUESTED" | null>(null);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState(lastDecision);
  const [projectStatus, setProjectStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reviewer identity lives in localStorage; it can only be read after hydration,
  // so this is a deliberate post-mount state sync rather than derived state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setReviewer(JSON.parse(raw));
    } catch {}
  }, []);

  const pins: PreviewPin[] = useMemo(
    () => threads.filter((t) => t.device != null).map((t) => ({ id: t.id, n: t.n, x: t.x, y: t.y, device: t.device, resolved: !!t.resolvedAt })),
    [threads],
  );

  // Remember what the reviewer was trying to do so it continues after they identify themselves.
  const afterIdentity = useRef<(() => void) | null>(null);
  const ensureReviewer = (next: () => void) => {
    if (reviewer) return next();
    afterIdentity.current = next;
    setIdentityOpen(true);
  };

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`/api/review/${token}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
  }

  async function reload() {
    const res = await fetch(`/api/review/${token}/comments`);
    const data = (await res.json()) as { comments: RawThread[] };
    setThreads(toThreads(data.comments));
  }

  async function submitPin() {
    if (!pending || !reviewer || !draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await post("comments", { ...pending, body: draft.trim(), authorName: reviewer.name, authorEmail: reviewer.email });
      setDraft("");
      setPending(null);
      setPinMode(false);
      await reload();
      if (projectStatus === "DRAFT") setProjectStatus("IN_REVIEW");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision() {
    if (!decisionOpen || !reviewer) return;
    setBusy(true);
    setError(null);
    try {
      const a = await post<{ decision: string; reviewerName: string; createdAt: string; note: string | null }>("decision", {
        decision: decisionOpen,
        note: note.trim() || undefined,
        reviewerName: reviewer.name,
        reviewerEmail: reviewer.email,
      });
      setDecision(a);
      setProjectStatus(decisionOpen);
      setDecisionOpen(null);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const unresolved = threads.filter((t) => !t.resolvedAt).length;

  return (
    <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
      <div className="flex-1 min-w-0 flex flex-col min-h-[60dvh] lg:min-h-0">
        <div className="min-h-11 shrink-0 border-b bg-background flex items-center gap-2 px-3 sm:px-4 py-1.5">
          <h1 className="font-medium truncate min-w-0">{projectName}</h1>
          <Badge variant="secondary" className="font-mono">
            v{versionNumber}
          </Badge>
          <StatusBadge status={projectStatus} />
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => ensureReviewer(() => setDecisionOpen("CHANGES_REQUESTED"))}>
              <XCircleIcon data-icon="inline-start" />
              Request changes
            </Button>
            <Button size="sm" onClick={() => ensureReviewer(() => setDecisionOpen("APPROVED"))}>
              <CheckCircle2Icon data-icon="inline-start" />
              Approve
            </Button>
          </div>
        </div>
        <Preview
          src={src}
          pins={pins}
          activePinId={active}
          onPinClick={(id) => setActive(id)}
          pinMode={pinMode}
          onPinModeChange={(on) => ensureReviewer(() => setPinMode(on))}
          onPlacePin={(p) => ensureReviewer(() => setPending(p))}
        />
      </div>

      <aside className="w-full lg:w-88 shrink-0 border-t lg:border-t-0 lg:border-l bg-card overflow-auto">
        <section className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Comments · {unresolved} open</h2>
            {reviewer ? (
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setIdentityOpen(true)}>
                {reviewer.name}
              </button>
            ) : (
              <Button size="xs" variant="outline" onClick={() => setIdentityOpen(true)}>
                Who are you?
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Press <span className="font-medium text-foreground">Comment</span>, then click on the email to pin a note. Switch device tabs to comment on the mobile view.
          </p>
        </section>

        {decision && (
          <section className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              {decision.decision === "APPROVED" ? <CheckCircle2Icon className="size-4 text-ok" /> : <XCircleIcon className="size-4 text-warn" />}
              <span>
                <span className="font-medium">{decision.reviewerName}</span> {decision.decision === "APPROVED" ? "approved" : "requested changes"}
              </span>
              <time className="ml-auto text-xs text-muted-foreground">{new Date(decision.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time>
            </div>
            {decision.note && <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{decision.note}</p>}
          </section>
        )}

        <section className="px-4 py-3">
          {threads.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
              <MessageSquareIcon className="size-5 mx-auto mb-2" />
              No comments yet.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {threads.map((t) => (
                <CommentThread
                  key={t.id}
                  thread={t}
                  active={active === t.id}
                  onSelect={() => setActive(t.id)}
                  canResolve={false}
                  onReply={async (body) => {
                    if (!reviewer) return setIdentityOpen(true);
                    try {
                      await post("comments", { parentId: t.id, body, authorName: reviewer.name, authorEmail: reviewer.email });
                      await reload();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                />
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-err">{error}</p>}
        </section>
      </aside>

      {/* Pending pin composer */}
      {pending && reviewer && (
        <Modal title="Pin a comment" onClose={() => setPending(null)}>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="What should change here?" autoFocus />
          <div className="mt-3 flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy || !draft.trim()} onClick={submitPin}>
              Add comment
            </Button>
          </div>
        </Modal>
      )}

      {/* Reviewer identity */}
      {identityOpen && (
        <Modal title="Who is reviewing?" onClose={() => setIdentityOpen(false)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const r = { name: String(fd.get("name")).trim(), email: String(fd.get("email")).trim() };
              if (!r.name) return;
              setReviewer(r);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
              } catch {}
              setIdentityOpen(false);
              const next = afterIdentity.current;
              afterIdentity.current = null;
              next?.();
            }}
          >
            <p className="text-muted-foreground">No account needed. Your name is shown next to your comments and approval.</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rv-name">Name</Label>
              <Input id="rv-name" name="name" defaultValue={reviewer?.name} required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rv-email">Email (optional)</Label>
              <Input id="rv-email" name="email" type="email" defaultValue={reviewer?.email} />
            </div>
            <div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIdentityOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Continue
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Decision */}
      {decisionOpen && reviewer && (
        <Modal title={decisionOpen === "APPROVED" ? "Approve this version" : "Request changes"} onClose={() => setDecisionOpen(null)}>
          <p className="text-muted-foreground">
            {decisionOpen === "APPROVED"
              ? `You are approving version ${versionNumber} of "${projectName}" as ${reviewer.name}.`
              : "Summarise what needs to change. Pinned comments are already attached to this version."}
          </p>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-3" placeholder={decisionOpen === "APPROVED" ? "Optional note" : "What should change?"} />
          <div className="mt-3 flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDecisionOpen(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={submitDecision} variant={decisionOpen === "APPROVED" ? "default" : "destructive"}>
              {decisionOpen === "APPROVED" ? "Approve" : "Request changes"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    IN_REVIEW: { label: "In review", cls: "bg-primary/15 text-primary" },
    CHANGES_REQUESTED: { label: "Changes requested", cls: "bg-warn/15 text-warn" },
    APPROVED: { label: "Approved", cls: "bg-ok/15 text-ok" },
  };
  const s = map[status] ?? map.DRAFT;
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-popover p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <h2 className="font-medium text-[15px] mb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
}

