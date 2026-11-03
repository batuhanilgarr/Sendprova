import Link from "next/link";
import { Logo } from "@/components/logo";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center text-[15px] mb-8">
          <Logo markClassName="size-7" />
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
