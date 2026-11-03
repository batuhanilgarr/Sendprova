"use client";

import { useActionState } from "react";
import { sendTestAction } from "../app/p/[id]/actions";

const field = "w-full rounded-lg border border-border bg-bg-sunken px-2.5 py-1.5 outline-none focus:border-accent";

export function SendPanel({
  versionId,
  projectId,
  defaultSubject,
  senders,
  groups,
}: {
  versionId: string;
  projectId: string;
  defaultSubject: string;
  senders: { id: string; name: string; fromEmail: string; isDefault: boolean }[];
  groups: { id: string; name: string; count: number }[];
}) {
  const [state, action, pending] = useActionState(sendTestAction, null);
  const defaultSender = senders.find((s) => s.isDefault) ?? senders[0];

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="projectId" value={projectId} />

      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Konu</span>
        <input name="subject" defaultValue={defaultSubject} className={field} required />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Gönderici</span>
        <select name="senderId" defaultValue={defaultSender?.id} className={field}>
          {senders.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.fromEmail}
            </option>
          ))}
        </select>
      </label>

      {groups.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-fg-muted mb-1">Alıcı grupları</legend>
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg-sunken px-2.5 py-1.5">
              <input type="checkbox" name="groupIds" value={g.id} />
              <span className="flex-1">{g.name}</span>
              <span className="text-fg-subtle text-xs">{g.count}</span>
            </label>
          ))}
        </fieldset>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Ek alıcılar</span>
        <textarea name="extra" rows={2} placeholder="ad@ornek.com, diger@ornek.com" className={`${field} font-mono text-xs`} />
      </label>

      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Gönderiliyor…" : "Test gönder"}
        </button>
        {state && <span className={state.error ? "text-err" : "text-ok"}>{state.error ?? state.ok}</span>}
      </div>
    </form>
  );
}
