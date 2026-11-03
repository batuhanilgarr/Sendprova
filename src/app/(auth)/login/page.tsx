import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Giriş" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight mb-1">Giriş yap</h1>
      <p className="text-muted-foreground mb-5">Mailing&apos;lerine ve kredilerine ulaş.</p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
