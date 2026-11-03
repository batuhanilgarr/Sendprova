"use client";

import { BellIcon } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { notifyClientAction, replyCommentAction, resolveCommentAction } from "@/app/app/p/[id]/actions";
import { CommentThread } from "@/components/comment-thread";
import type { Thread } from "@/lib/threads";
import { Preview, type PreviewPin } from "@/components/preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Agency-side preview with comment pins. Clicking a pin scrolls the panel to the thread. */
export function AgencyPreview({ src, threads }: { src: string; threads: Thread[] }) {
  const [active, setActive] = useState<string | null>(null);
  const pins: PreviewPin[] = useMemo(
    () =>
      threads
        .filter((t) => t.device != null)
        .map((t) => ({ id: t.id, n: t.n, x: t.x, y: t.y, device: t.device, resolved: !!t.resolvedAt })),
    [threads],
  );
  return (
    <Preview
      src={src}
      pins={pins}
      activePinId={active}
      onPinClick={(id) => {
        setActive(id);
        window.dispatchEvent(new CustomEvent("sendprova:focus-comment", { detail: id }));
        document.getElementById(`c-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    />
  );
}

/** Agency-side thread list with reply and resolve, driven by server actions. */
export function AgencyComments({ projectId, threads }: { projectId: string; threads: Thread[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const onFocus = (e: Event) => setActive((e as CustomEvent<string>).detail);
    window.addEventListener("sendprova:focus-comment", onFocus);
    return () => window.removeEventListener("sendprova:focus-comment", onFocus);
  }, []);

  if (threads.length === 0) return <p className="text-muted-foreground">No comments on this version yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {threads.map((t) => (
        <div key={t.id} id={`c-${t.id}`}>
          <CommentThread
            thread={t}
            active={active === t.id}
            onSelect={() => setActive(t.id)}
            canResolve
            onReply={async (body) => {
              const fd = new FormData();
              fd.set("projectId", projectId);
              fd.set("parentId", t.id);
              fd.set("body", body);
              await replyCommentAction(fd);
            }}
            onResolve={async (resolved) => {
              const fd = new FormData();
              fd.set("projectId", projectId);
              fd.set("id", t.id);
              fd.set("resolved", resolved ? "1" : "0");
              await resolveCommentAction(fd);
            }}
          />
        </div>
      ))}
    </ul>
  );
}

export function NotifyClientForm({ projectId, contactEmail }: { projectId: string; contactEmail: string | null }) {
  const [state, action, pending] = useActionState(notifyClientAction, null);
  const [open, setOpen] = useState(false);
  if (!contactEmail) return <p className="text-muted-foreground">Assign a client with a contact email to send review invitations.</p>;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      {open && <Textarea name="message" rows={3} placeholder="Optional message to the client" />}
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="submit" size="sm" disabled={pending}>
          <BellIcon data-icon="inline-start" />
          {pending ? "Sending…" : `Send review link to ${contactEmail}`}
        </Button>
        {!open && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Add message
          </Button>
        )}
        {state && <span className={state.error ? "text-err" : "text-ok"}>{state.error ?? state.ok}</span>}
      </div>
    </form>
  );
}
