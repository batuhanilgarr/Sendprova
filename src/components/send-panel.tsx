"use client";

import { SendIcon } from "lucide-react";
import { useActionState } from "react";
import { sendTestAction } from "@/app/app/p/[id]/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

      <div className="flex flex-col gap-1.5">
        <Label>Subject</Label>
        <Input name="subject" defaultValue={defaultSubject} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Sender</Label>
        <select
          name="senderId"
          defaultValue={defaultSender?.id}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {senders.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.fromEmail}
            </option>
          ))}
        </select>
      </div>

      {groups.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium mb-1.5">Recipient groups</legend>
          {groups.map((g) => (
            <Label key={g.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-2 font-normal has-data-checked:border-primary/50 has-data-checked:bg-primary/5">
              <Checkbox name="groupIds" value={g.id} />
              <span className="flex-1">{g.name}</span>
              <span className="text-muted-foreground text-xs">{g.count}</span>
            </Label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Extra recipients</Label>
        <Textarea name="extra" rows={2} placeholder="name@example.com, other@example.com" className="font-mono text-xs" />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <SendIcon data-icon="inline-start" />
          {pending ? "Sending…" : "Send test"}
        </Button>
        {state && <span className={state.error ? "text-err" : "text-ok"}>{state.error ?? state.ok}</span>}
      </div>
    </form>
  );
}
