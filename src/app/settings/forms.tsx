"use client";

import { useActionState } from "react";
import { saveGroup, saveSender, testSenderConnection, type ActionState } from "./actions";

function Status({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p className={state.error ? "text-err" : "text-ok"}>{state.error ?? state.ok}</p>;
}

const field = "w-full rounded-lg border border-border bg-bg-sunken px-2.5 py-1.5 outline-none focus:border-accent";

export function SenderForm({
  initial,
}: {
  initial?: { id: string; name: string; fromName: string; fromEmail: string; host: string; port: number; secure: boolean; user: string };
}) {
  const [state, action, pending] = useActionState(saveSender, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="flex flex-col gap-1 col-span-2">
        <span className="text-fg-muted">Profil adı</span>
        <input name="name" defaultValue={initial?.name} placeholder="Amazon SES" className={field} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Gönderen adı</span>
        <input name="fromName" defaultValue={initial?.fromName} placeholder="Anadolubank" className={field} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Gönderen e-posta</span>
        <input name="fromEmail" type="email" defaultValue={initial?.fromEmail} placeholder="test@sirket.com" className={field} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">SMTP sunucusu</span>
        <input name="host" defaultValue={initial?.host} placeholder="email-smtp.eu-west-1.amazonaws.com" className={field} required />
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted">Port</span>
          <input name="port" type="number" defaultValue={initial?.port ?? 587} className={field} required />
        </label>
        <label className="flex items-center gap-2 pb-2">
          <input name="secure" type="checkbox" defaultChecked={initial?.secure} /> TLS (465)
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Kullanıcı</span>
        <input name="user" defaultValue={initial?.user} autoComplete="off" className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Şifre {initial && <span className="text-fg-subtle">(boş bırakırsan değişmez)</span>}</span>
        <input name="pass" type="password" autoComplete="new-password" className={field} />
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
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
      <button disabled={pending} className="btn">
        {pending ? "Deneniyor…" : "Bağlantıyı dene"}
      </button>
      {state && <span className={state.error ? "text-err" : "text-ok"}>{state.error ? "Hata" : "OK"}</span>}
    </form>
  );
}

export function GroupForm({ initial }: { initial?: { id: string; name: string; emails: string } }) {
  const [state, action, pending] = useActionState(saveGroup, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">Grup adı</span>
        <input name="name" defaultValue={initial?.name} placeholder="Ekip" className={field} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-fg-muted">E-postalar (satır, virgül veya boşlukla ayır)</span>
        <textarea name="emails" defaultValue={initial?.emails} rows={4} className={`${field} font-mono text-xs`} required />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
