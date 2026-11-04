"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyField({ value, className = "" }: { value: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Input readOnly value={value} className="font-mono text-xs h-7" onFocus={(e) => e.currentTarget.select()} />
      <Button
        variant="outline"
        size="icon-xs"
        aria-label="Copy"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <CheckIcon className="text-ok" /> : <CopyIcon />}
      </Button>
    </div>
  );
}
