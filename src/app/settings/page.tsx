import { connection } from "next/server";
import { Suspense } from "react";
import { db, defaultWorkspace } from "../../lib/db";
import { ensureDefaultSender, smtpConfigSchema } from "../../lib/mailer";
import { deleteGroup, deleteSender, setDefaultSender } from "./actions";
import { GroupForm, SenderForm, TestConnectionButton } from "./forms";

export const metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
      <Suspense fallback={<p className="text-fg-subtle">Yükleniyor…</p>}>
        <Senders />
      </Suspense>
      <Suspense fallback={null}>
        <Groups />
      </Suspense>
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
      <h2 className="text-sm font-medium text-fg-muted mb-1">Gönderici profilleri</h2>
      <p className="text-fg-subtle mb-4">Test e-postaları bu SMTP hesaplarından çıkar. Yerelde Mailpit, üretimde SES/Resend SMTP.</p>
      <ul className="flex flex-col gap-3">
        {senders.map((s) => {
          const c = smtpConfigSchema.safeParse(s.config);
          return (
            <li key={s.id} className="rounded-xl border border-border bg-bg-elevated">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <span className="font-medium">{s.name}</span>
                {s.isDefault && <span className="rounded-md bg-accent/15 text-accent px-1.5 py-0.5 text-[11px]">varsayılan</span>}
                <span className="text-fg-subtle font-mono text-xs truncate">
                  {s.fromName} &lt;{s.fromEmail}&gt; · {c.success ? `${c.data.host}:${c.data.port}` : "?"}
                </span>
                <div className="ml-auto flex gap-1">
                  <TestConnectionButton id={s.id} />
                  {!s.isDefault && (
                    <form action={setDefaultSender}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn">Varsayılan yap</button>
                    </form>
                  )}
                  <form action={deleteSender}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn text-err">Sil</button>
                  </form>
                </div>
              </div>
              <details>
                <summary className="cursor-pointer px-4 py-2 text-fg-muted select-none">Düzenle</summary>
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
        <li className="rounded-xl border border-dashed border-border-strong p-4">
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
      <h2 className="text-sm font-medium text-fg-muted mb-1">Alıcı grupları</h2>
      <p className="text-fg-subtle mb-4">Ekip, Müşteri X gibi kayıtlı listeler. Gönderim panelinde tek tıkla seçilir.</p>
      <ul className="flex flex-col gap-3">
        {groups.map((g) => (
          <li key={g.id} className="rounded-xl border border-border bg-bg-elevated">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <span className="font-medium">{g.name}</span>
              <span className="text-fg-subtle text-xs">{g.recipients.length} alıcı</span>
              <form action={deleteGroup} className="ml-auto">
                <input type="hidden" name="id" value={g.id} />
                <button className="btn text-err">Sil</button>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer px-4 py-2 text-fg-muted select-none">Düzenle</summary>
              <div className="px-4 pb-4">
                <GroupForm initial={{ id: g.id, name: g.name, emails: g.recipients.map((r) => r.email).join("\n") }} />
              </div>
            </details>
          </li>
        ))}
        <li className="rounded-xl border border-dashed border-border-strong p-4">
          <h3 className="font-medium mb-3">Yeni grup</h3>
          <GroupForm />
        </li>
      </ul>
    </section>
  );
}
