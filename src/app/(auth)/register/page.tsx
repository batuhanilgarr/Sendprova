import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight mb-1">Create your account</h1>
      <p className="text-muted-foreground mb-5">50 free credits on sign-up. No credit card required.</p>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </>
  );
}
