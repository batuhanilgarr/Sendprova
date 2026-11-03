"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveClient, saveGroup, saveSender, testSenderConnection, type ActionState } from "./actions";

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
      <Field label="Profile name" className="sm:col-span-2">
        <Input name="name" defaultValue={initial?.name} placeholder="Gmail, Amazon SES…" required />
      </Field>
      <Field label="From name">
        <Input name="fromName" defaultValue={initial?.fromName} placeholder="Acme Inc." required />
      </Field>
      <Field label="From email">
        <Input name="fromEmail" type="email" defaultValue={initial?.fromEmail} placeholder="test@company.com" required />
      </Field>
      <Field label="SMTP host">
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
      <Field label="Username">
        <Input name="user" defaultValue={initial?.user} autoComplete="off" />
      </Field>
      <Field label="Password" hint={initial ? "(leave blank to keep current)" : undefined}>
        <Input name="pass" type="password" autoComplete="new-password" />
      </Field>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
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
        {pending ? "Testing…" : "Test connection"}
      </Button>
      {state && (
        <span className={state.error ? "text-err" : "text-ok"} title={state.error}>
          {state.error ? "Error" : "OK"}
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
      <Field label="Group name">
        <Input name="name" defaultValue={initial?.name} placeholder="Team" required />
      </Field>
      <Field label="Email addresses" hint="(separate with newlines, commas or spaces)">
        <Textarea name="emails" defaultValue={initial?.emails} rows={4} className="font-mono text-xs" required />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ClientForm({ initial }: { initial?: { id: string; name: string; contactName: string; contactEmail: string; color: string } }) {
  const [state, action, pending] = useActionState(saveClient, null);
  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Client name" className="sm:col-span-2">
        <Input name="name" defaultValue={initial?.name} placeholder="Acme Bank" required />
      </Field>
      <Field label="Contact name">
        <Input name="contactName" defaultValue={initial?.contactName} placeholder="Jane Doe" />
      </Field>
      <Field label="Contact email" hint="(receives review invitations)">
        <Input name="contactEmail" type="email" defaultValue={initial?.contactEmail} placeholder="jane@acme.com" />
      </Field>
      <Field label="Brand color" hint="(hex, optional)">
        <Input name="color" defaultValue={initial?.color} placeholder="#4F46E5" className="font-mono" />
      </Field>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}
