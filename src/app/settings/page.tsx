import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db, defaultWorkspace } from "@/lib/db";
import { ensureDefaultSender, smtpConfigSchema } from "@/lib/mailer";
import { deleteGroup, deleteSender, setDefaultSender } from "./actions";
import { GroupForm, SenderForm, TestConnectionButton } from "./forms";

export const metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
      <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
        <Senders />
      </Suspense>
      <Suspense fallback={null}>
        <Groups />
      </Suspense>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

async function Senders() {
  await connection();
  await ensureDefaultSender();
  const workspace = await defaultWorkspace();
  const senders = await db.senderProfile.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } });

  return (
    <section>
      <SectionHeader title="Gönderici profilleri" description="Test e-postaları bu SMTP hesaplarından çıkar. Yerelde Mailpit, üretimde Gmail, SES veya Resend SMTP." />
      <ul className="flex flex-col gap-3">
        {senders.map((s) => {
          const c = smtpConfigSchema.safeParse(s.config);
          return (
            <li key={s.id} className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b">
                <span className="font-medium">{s.name}</span>
                {s.isDefault && <Badge>varsayılan</Badge>}
                <span className="basis-full sm:basis-auto text-muted-foreground font-mono text-xs truncate">
                  {s.fromName} &lt;{s.fromEmail}&gt; · {c.success ? `${c.data.host}:${c.data.port}` : "?"}
                </span>
                <div className="ml-auto flex flex-wrap gap-1">
                  <TestConnectionButton id={s.id} />
                  {!s.isDefault && (
                    <form action={setDefaultSender}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Varsayılan yap
                      </Button>
                    </form>
                  )}
                  <form action={deleteSender}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Sil
                    </Button>
                  </form>
                </div>
              </div>
              <details>
                <summary className="cursor-pointer px-4 py-2 text-muted-foreground select-none">Düzenle</summary>
                <div className="px-4 pb-4">
                  <SenderForm
                    initial={{
                      id: s.id,
                      name: s.name,
                      fromName: s.fromName,
                      fromEmail: s.fromEmail,
                      host: c.success ? c.data.host : "",
                      port: c.success ? c.data.port : 587,
                      secure: c.success ? c.data.secure : false,
                      user: c.success ? c.data.user : "",
                    }}
                  />
                </div>
              </details>
            </li>
          );
        })}
        <li className="rounded-xl border border-dashed p-4">
          <h3 className="font-medium mb-3">Yeni gönderici</h3>
          <SenderForm />
        </li>
      </ul>
    </section>
  );
}

async function Groups() {
  await connection();
  const workspace = await defaultWorkspace();
  const groups = await db.recipientGroup.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    include: { recipients: { orderBy: { email: "asc" } } },
  });

  return (
    <section>
      <SectionHeader title="Alıcı grupları" description="Ekip, Müşteri X gibi kayıtlı listeler. Gönderim panelinde tek tıkla seçilir." />
      <ul className="flex flex-col gap-3">
        {groups.map((g) => (
          <li key={g.id} className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <span className="font-medium">{g.name}</span>
              <Badge variant="secondary">{g.recipients.length} alıcı</Badge>
              <form action={deleteGroup} className="ml-auto">
                <input type="hidden" name="id" value={g.id} />
                <Button type="submit" variant="destructive" size="sm">
                  Sil
                </Button>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer px-4 py-2 text-muted-foreground select-none">Düzenle</summary>
              <div className="px-4 pb-4">
                <GroupForm initial={{ id: g.id, name: g.name, emails: g.recipients.map((r) => r.email).join("\n") }} />
              </div>
            </details>
          </li>
        ))}
        <li className="rounded-xl border border-dashed p-4">
          <h3 className="font-medium mb-3">Yeni grup</h3>
          <GroupForm />
        </li>
      </ul>
    </section>
  );
}
