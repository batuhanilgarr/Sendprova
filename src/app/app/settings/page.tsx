import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { currentWorkspace } from "@/lib/session";
import { ensureDefaultSender, smtpConfigSchema } from "@/lib/mailer";
import { deleteClient, deleteGroup, deleteSender, setDefaultSender } from "./actions";
import { ClientForm, GroupForm, SenderForm, TestConnectionButton } from "./forms";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Clients />
      </Suspense>
      <Suspense fallback={null}>
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
  const workspace = await currentWorkspace();
  await ensureDefaultSender(workspace.id);
  const senders = await db.senderProfile.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } });

  return (
    <section>
      <SectionHeader title="Sender profiles" description="Test emails go out through these SMTP accounts. Mailpit locally; Gmail, SES or Resend SMTP in production." />
      <ul className="flex flex-col gap-3">
        {senders.map((s) => {
          const c = smtpConfigSchema.safeParse(s.config);
          return (
            <li key={s.id} className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b">
                <span className="font-medium">{s.name}</span>
                {s.isDefault && <Badge>default</Badge>}
                <span className="basis-full sm:basis-auto text-muted-foreground font-mono text-xs truncate">
                  {s.fromName} &lt;{s.fromEmail}&gt; · {c.success ? `${c.data.host}:${c.data.port}` : "?"}
                </span>
                <div className="ml-auto flex flex-wrap gap-1">
                  <TestConnectionButton id={s.id} />
                  {!s.isDefault && (
                    <form action={setDefaultSender}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Make default
                      </Button>
                    </form>
                  )}
                  <form action={deleteSender}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
              <details>
                <summary className="cursor-pointer px-4 py-2 text-muted-foreground select-none">Edit</summary>
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
          <h3 className="font-medium mb-3">New sender</h3>
          <SenderForm />
        </li>
      </ul>
    </section>
  );
}

async function Groups() {
  await connection();
  const workspace = await currentWorkspace();
  const groups = await db.recipientGroup.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    include: { recipients: { orderBy: { email: "asc" } } },
  });

  return (
    <section>
      <SectionHeader title="Recipient groups" description="Saved lists such as Team or Client X, selectable with one click in the send panel." />
      <ul className="flex flex-col gap-3">
        {groups.map((g) => (
          <li key={g.id} className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <span className="font-medium">{g.name}</span>
              <Badge variant="secondary">{g.recipients.length} recipient{g.recipients.length === 1 ? "" : "s"}</Badge>
              <form action={deleteGroup} className="ml-auto">
                <input type="hidden" name="id" value={g.id} />
                <Button type="submit" variant="destructive" size="sm">
                  Delete
                </Button>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer px-4 py-2 text-muted-foreground select-none">Edit</summary>
              <div className="px-4 pb-4">
                <GroupForm initial={{ id: g.id, name: g.name, emails: g.recipients.map((r) => r.email).join("\n") }} />
              </div>
            </details>
          </li>
        ))}
        <li className="rounded-xl border border-dashed p-4">
          <h3 className="font-medium mb-3">New group</h3>
          <GroupForm />
        </li>
      </ul>
    </section>
  );
}

async function Clients() {
  await connection();
  const workspace = await currentWorkspace();
  const clients = await db.client.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <section>
      <SectionHeader title="Clients" description="Your customers. Projects are grouped by client and review invitations go to the client contact." />
      <ul className="flex flex-col gap-3">
        {clients.map((c) => (
          <li key={c.id} className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <span className="size-3 rounded-full border" style={{ background: c.color ?? "transparent" }} aria-hidden />
              <span className="font-medium">{c.name}</span>
              <Badge variant="secondary">{c._count.projects} projects</Badge>
              {c.contactEmail && <span className="text-muted-foreground font-mono text-xs truncate">{c.contactEmail}</span>}
              <form action={deleteClient} className="ml-auto">
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" variant="destructive" size="sm">
                  Delete
                </Button>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer px-4 py-2 text-muted-foreground select-none">Edit</summary>
              <div className="px-4 pb-4">
                <ClientForm initial={{ id: c.id, name: c.name, contactName: c.contactName ?? "", contactEmail: c.contactEmail ?? "", color: c.color ?? "" }} />
              </div>
            </details>
          </li>
        ))}
        <li className="rounded-xl border border-dashed p-4">
          <h3 className="font-medium mb-3">New client</h3>
          <ClientForm />
        </li>
      </ul>
    </section>
  );
}
