import type { Finding } from "@/lib/brand-checks";

const GROUP_LABEL: Record<Finding["group"], string> = { technical: "Technical", brand: "Brand", legal: "Legal", tracking: "Tracking" };

export function ScoreCard({ score, counts, hasKit, compact }: { score: number; counts: Record<"ok" | "warn" | "err", number>; hasKit: boolean; compact?: boolean }) {
  const tone = counts.err > 0 ? "err" : score >= 90 ? "ok" : "warn";
  const label = counts.err > 0 ? "Blocked" : score >= 90 ? "Ready to send" : score >= 70 ? "Nearly ready" : "Needs work";
  const ring = tone === "ok" ? "stroke-ok" : tone === "warn" ? "stroke-warn" : "stroke-err";
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-card ${compact ? "p-2.5" : "p-3"} mb-3`}>
      <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90">
        <circle cx="28" cy="28" r={r} className="stroke-muted" strokeWidth="6" fill="none" />
        <circle cx="28" cy="28" r={r} className={ring} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
        <text x="28" y="28" transform="rotate(90 28 28)" textAnchor="middle" dominantBaseline="central" className="fill-foreground font-mono text-[13px] font-semibold">
          {score}
        </text>
      </svg>
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">
          {counts.err} blocking · {counts.warn} warnings · {counts.ok} passed{hasKit ? "" : " · no brand kit"}
        </div>
      </div>
    </div>
  );
}

export function FindingsList({ findings, showGroups = true }: { findings: Finding[]; showGroups?: boolean }) {
  const order: Finding["group"][] = ["technical", "brand", "legal", "tracking"];
  const groups = order.map((g) => [g, findings.filter((f) => f.group === g)] as const).filter(([, list]) => list.length);
  return (
    <div className="flex flex-col gap-3">
      {groups.map(([g, list]) => (
        <div key={g}>
          {showGroups && groups.length > 1 && <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{GROUP_LABEL[g]}</div>}
          <ul className="flex flex-col gap-1.5">
            {list.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${f.tone === "ok" ? "bg-ok" : f.tone === "warn" ? "bg-warn" : "bg-err"}`} />
                <div className="min-w-0">
                  <span>{f.text}</span>
                  {f.details && f.details.length > 0 && (
                    <ul className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {f.details.map((d, j) => (
                        <li key={j} className="truncate">
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
