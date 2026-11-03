"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustCredits } from "./actions";

export function CreditForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useActionState(adjustCredits, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Input name="delta" type="number" placeholder="+100" className="w-24 font-mono" required />
      <Input name="reason" placeholder="Reason (e.g. Starter pack)" className="w-56" required />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Apply credits"}
      </Button>
      {state && <span className={state.error ? "text-err" : "text-ok"}>{state.error ?? state.ok}</span>}
    </form>
  );
}
