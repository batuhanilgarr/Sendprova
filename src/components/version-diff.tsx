"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TextDiffLine } from "@/lib/diff";

export interface DiffView {
  device: "desktop" | "mobile";
  beforeUrl: string;
  afterUrl: string;
  diffUrl: string;
  width: number;
  height: number;
  changedRatio: number;
}

/**
 * Before/after slider with an optional change-highlight overlay, plus the
 * text diff. Shared by the agency workbench and the client review page.
 */
export function VersionDiff({ baseNumber, number, views, text }: { baseNumber: number; number: number; views: DiffView[]; text: { lines: TextDiffLine[]; added: number; removed: number } }) {
  const [device, setDevice] = useState<"desktop" | "mobile">(views[0]?.device ?? "desktop");
  const [mode, setMode] = useState<"slider" | "highlight" | "side">("highlight");
  const [pos, setPos] = useState(50);
  const view = views.find((v) => v.device === device) ?? views[0];
  if (!view) return null;
  const pct = (view.changedRatio * 100).toFixed(view.changedRatio < 0.01 ? 2 : 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={device} onValueChange={(v) => setDevice(v as "desktop" | "mobile")}>
          <TabsList>
            {views.map((v) => (
              <TabsTrigger key={v.device} value={v.device}>
                {v.device === "desktop" ? "Desktop" : "Mobile"}
                <span className="font-mono text-[11px] text-muted-foreground">{(v.changedRatio * 100).toFixed(1)}%</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-1">
          {(["highlight", "slider", "side"] as const).map((m) => (
            <Button key={m} size="xs" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
              {m === "highlight" ? "Highlight" : m === "slider" ? "Slider" : "Side by side"}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground">
        v{baseNumber} → v{number}: <span className="font-mono text-foreground">{pct}%</span> of pixels changed on {device}, {text.added} lines added, {text.removed} removed.
      </p>

      {mode === "side" ? (
        <div className="grid grid-cols-2 gap-2">
          {[view.beforeUrl, view.afterUrl].map((u, i) => (
            <figure key={u} className="rounded-lg border bg-white overflow-hidden">
              <figcaption className="px-2 py-1 text-[11px] font-mono text-muted-foreground border-b bg-card">{i === 0 ? `v${baseNumber}` : `v${number}`}</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="block w-full" />
            </figure>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="relative" style={{ aspectRatio: `${view.width} / ${view.height}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={view.afterUrl} alt={`Version ${number}`} className="absolute inset-0 block w-full" />
            {mode === "highlight" && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={view.diffUrl} alt="Changed regions" className="absolute inset-0 block w-full mix-blend-multiply" />
            )}
            {mode === "slider" && (
              <>
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={view.beforeUrl} alt={`Version ${baseNumber}`} className="block" style={{ width: `${(100 * 100) / pos}%`, maxWidth: "none" }} />
                </div>
                <div className="absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${pos}%` }} />
                <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 text-[10px] font-mono text-white">v{baseNumber}</span>
                <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 text-[10px] font-mono text-white">v{number}</span>
              </>
            )}
          </div>
          {mode === "slider" && <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="w-full accent-primary" aria-label="Compare position" />}
        </div>
      )}

      {text.lines.length > 0 && (text.added > 0 || text.removed > 0) && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-2 py-1 text-[11px] font-mono text-muted-foreground border-b">Text changes</div>
          <pre className="max-h-64 overflow-auto p-2 text-xs font-mono leading-5">
            {text.lines.map((l, i) => (
              <div key={i} className={l.type === "added" ? "bg-ok/15 text-ok" : l.type === "removed" ? "bg-err/15 text-err line-through decoration-err/60" : "text-muted-foreground"}>
                <span className="inline-block w-4 select-none">{l.type === "added" ? "+" : l.type === "removed" ? "−" : " "}</span>
                {l.text || " "}
              </div>
            ))}
          </pre>
        </div>
      )}
      {text.added === 0 && text.removed === 0 && <p className="text-muted-foreground">No text changes between these versions.</p>}
    </div>
  );
}
