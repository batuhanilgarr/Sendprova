import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold tracking-tight text-[15px] mb-8">
          <span className="inline-grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground text-xs font-bold" aria-hidden>
            S
          </span>
          Sendprova
        </Link>
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <div className="rounded-2xl border bg-card p-6">{children}</div>
      </div>
    </main>
  );
}

async function RedirectIfSignedIn() {
  await connection();
  if (await getSession()) redirect("/app");
  return null;
}
