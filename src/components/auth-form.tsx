"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("banned") ? "Hesabın askıya alınmış." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const res =
      mode === "register"
        ? await authClient.signUp.email({ name: String(fd.get("name")), email, password })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (res.error) {
      setError(translate(res.error.code, res.error.message));
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {mode === "register" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Ad</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" name="password" type="password" minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} required />
      </div>
      {error && <p className="text-err">{error}</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Bekle…" : mode === "register" ? "Hesap oluştur" : "Giriş yap"}
      </Button>
      <p className="text-muted-foreground text-center">
        {mode === "register" ? (
          <>
            Hesabın var mı?{" "}
            <Link href="/login" className="underline underline-offset-2">
              Giriş yap
            </Link>
          </>
        ) : (
          <>
            Hesabın yok mu?{" "}
            <Link href="/register" className="underline underline-offset-2">
              Kayıt ol
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function translate(code: string | undefined, fallback: string | undefined) {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-posta veya şifre hatalı.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Bu e-posta ile zaten bir hesap var.";
    case "PASSWORD_TOO_SHORT":
      return "Şifre en az 8 karakter olmalı.";
    case "BANNED_USER":
      return "Hesabın askıya alınmış.";
    default:
      return fallback ?? "Bir şeyler ters gitti.";
  }
}
