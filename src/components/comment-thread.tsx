"use client";

import { CheckIcon, CornerDownRightIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { Thread } from "@/lib/threads";
export type { Thread, ThreadComment } from "@/lib/threads";

export function CommentThread({
  thread,
  active,
  onSelect,
  onReply,
  onResolve,
  canResolve,
}: {
  thread: Thread;
  active: boolean;
  onSelect: () => void;
  onReply: (body: string) => Promise<void>;
  onResolve?: (resolved: boolean) => Promise<void>;
  canResolve: boolean;
}) {
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const resolved = !!thread.resolvedAt;

  return (
    <li
      className={["rounded-xl border p-3 transition-colors", active ? "border-primary/60 bg-primary/5" : "bg-card", resolved ? "opacity-70" : ""].join(" ")}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full rounded-bl-none text-[11px] font-semibold ${resolved ? "bg-zinc-500 text-white" : "bg-primary text-primary-foreground"}`}>
          {thread.n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium truncate">{thread.authorName}</span>
            {thread.byUserId && <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">team</span>}
            {thread.device && <span className="text-muted-foreground">{thread.device}</span>}
            <time className="ml-auto text-muted-foreground whitespace-nowrap">{fmt(thread.createdAt)}</time>
          </div>
          <p className="mt-1 whitespace-pre-wrap">{thread.body}</p>
          {thread.replies.map((r) => (
            <div key={r.id} className="mt-2 flex gap-2 border-l-2 pl-2">
              <CornerDownRightIcon className="size-3 shrink-0 mt-1 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium truncate">{r.authorName}</span>
                  {r.byUserId && <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">team</span>}
                  <time className="text-muted-foreground">{fmt(r.createdAt)}</time>
                </div>
                <p className="whitespace-pre-wrap">{r.body}</p>
              </div>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
              Reply
            </Button>
            {canResolve && onResolve && (
              <Button
                variant="ghost"
                size="xs"
                disabled={busy}
                onClick={async (e) => {
                  e.stopPropagation();
                  setBusy(true);
                  await onResolve(!resolved);
                  setBusy(false);
                }}
              >
                {resolved ? <RotateCcwIcon data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                {resolved ? "Reopen" : "Resolve"}
              </Button>
            )}
            {resolved && !canResolve && <span className="text-xs text-ok">Resolved</span>}
          </div>
          {open && (
            <form
              className="mt-2 flex flex-col gap-2"
              onClick={(e) => e.stopPropagation()}
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                setBusy(true);
                await onReply(reply.trim());
                setReply("");
                setOpen(false);
                setBusy(false);
              }}
            >
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Write a reply…" autoFocus />
              <div className="flex justify-end gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={busy || !reply.trim()}>
                  Send
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
