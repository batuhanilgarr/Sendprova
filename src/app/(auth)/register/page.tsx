import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Kayıt" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight mb-1">Hesap oluştur</h1>
      <p className="text-muted-foreground mb-5">Kayıtta 50 kredi hediye. Kredi kartı gerekmez.</p>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </>
  );
}
