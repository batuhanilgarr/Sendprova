"use client";

import { GitCompareIcon } from "lucide-react";
import { useActionState } from "react";
import { compareAction } from "@/app/app/p/[id]/actions";
import { Button } from "@/components/ui/button";

export function CompareButton({ projectId, versionId, hasDiff }: { projectId: string; versionId: string; hasDiff: boolean }) {
  const [state, action, pending] = useActionState(compareAction, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="versionId" value={versionId} />
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        <GitCompareIcon data-icon="inline-start" />
        {pending ? "Rendering…" : hasDiff ? "Re-compare" : "Compare with previous"}
      </Button>
      {state?.error && <span className="text-err text-xs">{state.error}</span>}
    </form>
  );
}
