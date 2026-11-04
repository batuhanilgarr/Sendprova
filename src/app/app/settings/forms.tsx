"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBranding, saveClient, saveGroup, saveSender, testSenderConnection, type ActionState } from "./actions";

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

export interface ClientFormValues {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  color: string;
  colors: string;
  fonts: string;
  footerText: string;
  physicalAddress: string;
  unsubscribeToken: string;
  utmTemplate: string;
  allowedDomains: string;
}

export function ClientForm({ initial }: { initial?: ClientFormValues }) {
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

      <div className="sm:col-span-2 mt-2 border-t pt-3">
        <h4 className="font-medium">Brand kit</h4>
        <p className="text-muted-foreground">Every field is optional. Filled fields become checks on every version of this client&apos;s projects.</p>
      </div>
      <Field label="Palette" hint="(hex colors, comma separated)">
        <Input name="colors" defaultValue={initial?.colors} placeholder="#0033A0, #E6007E, #333333" className="font-mono" />
      </Field>
      <Field label="Fonts" hint="(family names, comma separated)">
        <Input name="fonts" defaultValue={initial?.fonts} placeholder="Montserrat, Arial" />
      </Field>
      <Field label="Required footer text" className="sm:col-span-2">
        <Textarea name="footerText" defaultValue={initial?.footerText} rows={2} placeholder="If you no longer wish to receive campaign emails, please click here." />
      </Field>
      <Field label="Physical address" className="sm:col-span-2">
        <Input name="physicalAddress" defaultValue={initial?.physicalAddress} placeholder="Acme Inc., 1 Example Street, Istanbul" />
      </Field>
      <Field label="Unsubscribe token" hint="(placeholder or URL fragment)">
        <Input name="unsubscribeToken" defaultValue={initial?.unsubscribeToken} placeholder="{unsubscribelink}" className="font-mono" />
      </Field>
      <Field label="UTM template" hint="(required query parameters)">
        <Input name="utmTemplate" defaultValue={initial?.utmTemplate} placeholder="utm_source=newsletter&utm_medium=email" className="font-mono" />
      </Field>
      <Field label="Allowed link domains" hint="(comma separated; UTM is checked on these)" className="sm:col-span-2">
        <Input name="allowedDomains" defaultValue={initial?.allowedDomains} placeholder="acme.com, shop.acme.com" className="font-mono" />
      </Field>

      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function BrandingForm({ initial }: { initial: { brandName: string; brandLogoUrl: string; brandColor: string; hidePoweredBy: boolean; reviewDomain: string } }) {
  const [state, action, pending] = useActionState(saveBranding, null);
  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Agency name" hint="(shown to clients)">
        <Input name="brandName" defaultValue={initial.brandName} placeholder="Studio North" />
      </Field>
      <Field label="Logo URL" hint="(https, PNG or SVG, ~24px tall)">
        <Input name="brandLogoUrl" type="url" defaultValue={initial.brandLogoUrl} placeholder="https://cdn.studio.com/logo.svg" className="font-mono" />
      </Field>
      <Field label="Accent color" hint="(hex)">
        <Input name="brandColor" defaultValue={initial.brandColor} placeholder="#4F46E5" className="font-mono" />
      </Field>
      <Field label="Review domain" hint="(CNAME to your deployment; routing lands with hosting)">
        <Input name="reviewDomain" defaultValue={initial.reviewDomain} placeholder="review.studio.com" className="font-mono" />
      </Field>
      <Label className="sm:col-span-2 flex items-center gap-2">
        <Checkbox name="hidePoweredBy" defaultChecked={initial.hidePoweredBy} /> Hide “powered by Sendprova” on client pages
      </Label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Status state={state} />
      </div>
    </form>
  );
}
