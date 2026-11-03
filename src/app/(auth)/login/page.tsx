import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight mb-1">Sign in</h1>
      <p className="text-muted-foreground mb-5">Get back to your mailings and credits.</p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
