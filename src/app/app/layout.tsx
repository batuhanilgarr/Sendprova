import { CoinsIcon, LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currentWorkspace, requireUser } from "@/lib/session";
import { signOutAction } from "./actions";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <header className="h-12 shrink-0 border-b bg-background/80 backdrop-blur flex items-center px-3 sm:px-4 gap-3 sticky top-0 z-30">
        <Link href="/app" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold" aria-hidden>
            S
          </span>
          Sendprova
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Suspense fallback={null}>
            <UserNav />
          </Suspense>
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </>
  );
}

async function UserNav() {
  await connection();
  const user = await requireUser();
  const workspace = await currentWorkspace();
  return (
    <>
      <Badge variant="secondary" className="font-mono gap-1" title="Credits: 1 credit = 1 test send to 1 recipient">
        <CoinsIcon className="size-3" />
        {workspace.credits}
      </Badge>
      {user.role === "admin" && (
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin" />}>
          <ShieldIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Admin</span>
        </Button>
      )}
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/app/settings" />}>
        <SettingsIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Settings</span>
      </Button>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="sm" title={user.email}>
          <LogOutIcon data-icon="inline-start" />
          <span className="hidden sm:inline max-w-32 truncate">{user.name || user.email}</span>
        </Button>
      </form>
    </>
  );
}
