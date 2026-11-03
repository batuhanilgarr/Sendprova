import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="h-12 shrink-0 border-b bg-background/80 backdrop-blur flex items-center px-3 sm:px-4 gap-3 sticky top-0 z-30">
        <Link href="/app" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold" aria-hidden>
            S
          </span>
          Sendprova
        </Link>
        <Badge>admin</Badge>
        <nav className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/app" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Uygulama
          </Button>
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </>
  );
}
