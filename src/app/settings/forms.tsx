"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveGroup, saveSender, testSenderConnection, type ActionState } from "./actions";

function Status({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p className={state.error ? "text-err" : "text-ok"}>{state.error ?? state.ok}</p>;
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>
        {label} {hint && <span className="text-muted-foreground font-normal">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

export function SenderForm({
  initial,
}: {
  initial?: { id: string; name: string; fromName: string; fromEmail: string; host: string; port: number; secure: boolean; user: string };
}) {
  const [state, action, pending] = useActionState(saveSender, null);
  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Profil adı" className="sm:col-span-2">
        <Input name="name" defaultValue={initial?.name} placeholder="Gmail, Amazon SES…" required />
      </Field>
      <Field label="Gönderen adı">
        <Input name="fromName" defaultValue={initial?.fromName} placeholder="Anadolubank" required />
      </Field>
      <Field label="Gönderen e-posta">
        <Input name="fromEmail" type="email" defaultValue={initial?.fromEmail} placeholder="test@sirket.com" required />
      </Field>
      <Field label="SMTP sunucusu">
        <Input name="host" defaultValue={initial?.host} placeholder="smtp.gmail.com" required />
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <Field label="Port">
          <Input name="port" type="number" defaultValue={initial?.port ?? 587} required />
        </Field>
        <Label className="flex items-center gap-2 h-8">
          <Checkbox name="secure" defaultChecked={initial?.secure} /> TLS (465)
        </Label>
      </div>
      <Field label="Kullanıcı">
        <Input name="user" defaultValue={initial?.user} autoComplete="off" />
      </Field>
      <Field label="Şifre" hint={initial ? "(boş bırakırsan değişmez)" : undefined}>
        <Input name="pass" type="password" autoComplete="new-password" />
      </Field>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function TestConnectionButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(testSenderConnection, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Deneniyor…" : "Bağlantıyı dene"}
      </Button>
      {state && (
        <span className={state.error ? "text-err" : "text-ok"} title={state.error}>
          {state.error ? "Hata" : "OK"}
        </span>
      )}
    </form>
  );
}

export function GroupForm({ initial }: { initial?: { id: string; name: string; emails: string } }) {
  const [state, action, pending] = useActionState(saveGroup, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Grup adı">
        <Input name="name" defaultValue={initial?.name} placeholder="Ekip" required />
      </Field>
      <Field label="E-postalar" hint="(satır, virgül veya boşlukla ayır)">
        <Textarea name="emails" defaultValue={initial?.emails} rows={4} className="font-mono text-xs" required />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}
