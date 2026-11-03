/**
 * Sendprova mark: an envelope flap folded into a check mark, meaning
 * "rehearsed and approved before it is sent". Uses currentColor so it
 * inherits text color; `accent` paints the check in the brand color.
 */
export function LogoMark({ className = "size-6", accent = true }: { className?: string; accent?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="28" height="20" rx="5" className="fill-current" />
      <path d="M6 11l10 7 10-7" stroke="var(--background)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="22" r="7" className={accent ? "fill-primary" : "fill-current"} stroke="var(--background)" strokeWidth="2" />
      <path d="M20.5 22l2.3 2.3 4-4.3" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = "", markClassName = "size-6", textClassName = "" }: { className?: string; markClassName?: string; textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <LogoMark className={markClassName} />
      <span className={textClassName}>
        Send<span className="text-primary">prova</span>
      </span>
    </span>
  );
}
