import nodemailer, { type Transporter } from "nodemailer";
import { z } from "zod";
import { db } from "./db";
import { injectPixel } from "./opens";

export const smtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.coerce.boolean().default(false),
  user: z.string().optional().default(""),
  pass: z.string().optional().default(""),
});
export type SmtpConfig = z.infer<typeof smtpConfigSchema>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseEmails(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => EMAIL_RE.test(e)),
    ),
  ];
}

export interface LabelledEmail {
  email: string;
  label?: string | null;
}

/**
 * One recipient per line. A label after "|" or a tab marks the seed device:
 *   outlook@team.com | Outlook 365 Win
 *   iphone@team.com  | iPhone Mail
 * Lines without a label fall back to comma/space separated plain emails.
 */
export function parseLabelledEmails(raw: string): LabelledEmail[] {
  const out = new Map<string, string | null>();
  for (const line of raw.split(/\r?\n/)) {
    const [left, ...rest] = line.split(/\s*[|\t]\s*/);
    const label = rest.join(" ").trim() || null;
    for (const email of parseEmails(left ?? "")) if (!out.has(email) || label) out.set(email, label);
  }
  return [...out.entries()].map(([email, label]) => ({ email, label }));
}

/** Seed a default SMTP sender from .env (Mailpit in dev) if the workspace has none. */
export async function ensureDefaultSender(workspaceId: string) {
  const existing = await db.senderProfile.findFirst({ where: { workspaceId } });
  if (existing) return existing;
  const from = process.env.SMTP_FROM ?? "Sendprova <test@sendprova.local>";
  const m = from.match(/^(.*?)\s*<([^>]+)>$/);
  const config: SmtpConfig = {
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  };
  return db.senderProfile.create({
    data: {
      workspaceId,
      name: "Mailpit (local)",
      fromName: m ? m[1].trim() : "Sendprova",
      fromEmail: m ? m[2].trim() : from,
      transport: "SMTP",
      config,
      isDefault: true,
    },
  });
}

function transportFor(transport: string, raw: unknown): Transporter {
  if (transport !== "SMTP") throw new Error(`${transport} transport is not supported yet`);
  const c = smtpConfigSchema.parse(raw);
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: c.user ? { user: c.user, pass: c.pass } : undefined,
  });
}

/** Crude plain-text alternative so clients that prefer text/plain get something readable. */
export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function verifySender(senderId: string) {
  const sender = await db.senderProfile.findUniqueOrThrow({ where: { id: senderId } });
  await transportFor(sender.transport, sender.config).verify();
}

/** Plain-text transactional email (notifications, review invitations). Not metered. */
export async function sendPlain(senderId: string, to: string, subject: string, text: string) {
  const sender = await db.senderProfile.findUniqueOrThrow({ where: { id: senderId } });
  const transport = transportFor(sender.transport, sender.config);
  try {
    await transport.sendMail({ from: { name: sender.fromName, address: sender.fromEmail }, to, subject, text });
  } finally {
    transport.close();
  }
}

/**
 * Create a TestSend with one Delivery per recipient and send them sequentially.
 * Sequential keeps SMTP connections simple; a queue replaces this later.
 */
export async function sendTest(opts: { versionId: string; senderId: string; subject: string; emails: (string | LabelledEmail)[]; userId: string }) {
  const version = await db.version.findUniqueOrThrow({ where: { id: opts.versionId }, include: { project: true } });
  const workspaceId = version.project.workspaceId;
  const sender = await db.senderProfile.findUniqueOrThrow({ where: { id: opts.senderId, workspaceId } });
  const byEmail = new Map<string, string | null>();
  for (const r of opts.emails) {
    const email = (typeof r === "string" ? r : r.email).trim().toLowerCase();
    if (!email) continue;
    const label = typeof r === "string" ? null : (r.label ?? null);
    if (!byEmail.has(email) || label) byEmail.set(email, label);
  }
  const emails = [...byEmail.keys()];
  if (emails.length === 0) throw new Error("At least one recipient is required.");

  // 1 credit per recipient, reserved up front inside a transaction so two
  // concurrent sends cannot overspend. Failed deliveries are refunded below.
  const testSend = await db.$transaction(async (tx) => {
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (ws.credits < emails.length) {
      throw new Error(`Not enough credits: ${emails.length} needed, ${ws.credits} available.`);
    }
    const created = await tx.testSend.create({
      data: {
        versionId: version.id,
        senderId: sender.id,
        subject: opts.subject,
        status: "SENDING",
        deliveries: { create: emails.map((email) => ({ email, label: byEmail.get(email) ?? null })) },
      },
      include: { deliveries: true },
    });
    await tx.workspace.update({ where: { id: workspaceId }, data: { credits: { decrement: emails.length } } });
    await tx.creditLedger.create({
      data: { workspaceId, delta: -emails.length, reason: `Test send: ${opts.subject}`, testSendId: created.id, byUserId: opts.userId },
    });
    return created;
  });

  const transport = transportFor(sender.transport, sender.config);
  const text = htmlToText(version.html);
  let failed = 0;

  for (const d of testSend.deliveries) {
    try {
      const info = await transport.sendMail({
        from: { name: sender.fromName, address: sender.fromEmail },
        to: d.email,
        subject: opts.subject,
        html: injectPixel(version.html, d.id),
        text,
        headers: { "X-Sendprova-Version": `${version.id}` },
      });
      await db.delivery.update({
        where: { id: d.id },
        data: { status: "SENT", messageId: info.messageId, sentAt: new Date() },
      });
    } catch (err) {
      failed++;
      await db.delivery.update({
        where: { id: d.id },
        data: { status: "FAILED", error: err instanceof Error ? err.message : String(err) },
      });
    }
  }
  transport.close();

  if (failed > 0) {
    await db.$transaction([
      db.workspace.update({ where: { id: workspaceId }, data: { credits: { increment: failed } } }),
      db.creditLedger.create({ data: { workspaceId, delta: failed, reason: "Refund for failed deliveries", testSendId: testSend.id } }),
    ]);
  }

  return db.testSend.update({
    where: { id: testSend.id },
    data: { status: failed === testSend.deliveries.length ? "FAILED" : "SENT" },
    include: { deliveries: true },
  });
}
