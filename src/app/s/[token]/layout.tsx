import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/** Minimal chrome for public share pages: no app navigation. */
export default function ShareLayout({ children }: LayoutProps<"/s/[token]">) {
  return (
    <>
      <header className="h-12 shrink-0 border-b bg-background/80 backdrop-blur flex items-center px-3 sm:px-4 gap-3 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold" aria-hidden>
            S
          </span>
          Sendprova
        </Link>
        <span className="text-muted-foreground text-xs">paylaşılan önizleme</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </>
  );
}
