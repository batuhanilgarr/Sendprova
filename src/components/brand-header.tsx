import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Brand } from "@/lib/branding";

/** Header for client-facing pages: the agency's brand, with a small "powered by" unless hidden. */
export function BrandHeader({ brand, subtitle, homeHref }: { brand: Brand; subtitle?: string; homeHref?: string }) {
  const mark = brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt={brand.name} className="h-6 max-w-40 object-contain" />
  ) : (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="inline-grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold" aria-hidden>
        {brand.name.slice(0, 1).toUpperCase()}
      </span>
      {brand.name}
    </span>
  );
  return (
    <header className="h-12 shrink-0 border-b bg-background/80 backdrop-blur flex items-center px-3 sm:px-4 gap-3 sticky top-0 z-30">
      {homeHref ? (
        <Link href={homeHref} className="flex items-center">
          {mark}
        </Link>
      ) : (
        <span className="flex items-center">{mark}</span>
      )}
      {subtitle && <span className="text-muted-foreground text-xs">{subtitle}</span>}
      <div className="ml-auto flex items-center gap-3">
        {!brand.hidePoweredBy && (
          <a href="https://sendprova.com" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            powered by <Logo markClassName="size-3.5" textClassName="text-[11px]" />
          </a>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
