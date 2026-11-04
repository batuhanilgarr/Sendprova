import { chromium } from "playwright";
import { checkResultSchema, type CheckResult } from "./checks";
import { db } from "./db";
import { latestApproval } from "./review";
import { kitFromClient, sendReadyScore } from "./score";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Loads everything the report needs for one version. Caller must have checked access. */
export async function preflightData(versionId: string) {
  const version = await db.version.findUniqueOrThrow({
    where: { id: versionId },
    include: { project: { include: { client: true, workspace: { include: { owner: true } } } }, _count: { select: { assets: true, comments: true } } },
  });
  const [lastRun, approval, snapshot] = await Promise.all([
    db.checkRun.findFirst({ where: { versionId }, orderBy: { createdAt: "desc" } }),
    latestApproval(versionId),
    db.snapshot.findUnique({ where: { versionId_device: { versionId, device: "desktop" } } }),
  ]);
  const parsed = lastRun ? checkResultSchema.safeParse(lastRun.result) : null;
  const live: CheckResult | null = parsed?.success ? parsed.data : null;
  const kit = kitFromClient(version.project.client);
  const score = sendReadyScore({ html: version.html, htmlBytes: version.htmlBytes, assetCount: version._count.assets, missingAssets: version.missingAssets, placeholders: version.placeholders, live, kit });
  return { version, approval, snapshot, kit, score };
}

export async function renderPreflightPdf(versionId: string) {
  const { version, approval, snapshot, kit, score: r } = await preflightData(versionId);
  const tone = (t: string) => (t === "ok" ? "#16a34a" : t === "warn" ? "#d97706" : "#dc2626");
  const groups = ["technical", "brand", "legal", "tracking"] as const;
  const label = { technical: "Technical", brand: "Brand", legal: "Legal", tracking: "Tracking" };
  const status = r.counts.err > 0 ? "Blocked" : r.score >= 90 ? "Ready to send" : r.score >= 70 ? "Nearly ready" : "Needs work";

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font:12px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}h2{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#71717a;margin:20px 0 6px}
    .muted{color:#71717a}.row{display:flex;gap:16px;align-items:center}
    .score{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font:600 20px monospace;border:5px solid ${tone(r.counts.err ? "err" : r.score >= 90 ? "ok" : "warn")}}
    ul{list-style:none;padding:0;margin:0}li{display:flex;gap:8px;margin:3px 0}.dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex:none}
    .d{font:10px monospace;color:#71717a;margin-left:16px}
    table{border-collapse:collapse;font-size:11px}td{padding:2px 12px 2px 0;vertical-align:top}
    img.shot{max-width:100%;border:1px solid #e4e4e7;border-radius:6px;margin-top:8px}
    .foot{margin-top:28px;padding-top:8px;border-top:1px solid #e4e4e7;color:#71717a;font-size:10px}
  </style></head><body>
    <div class="row"><div class="score">${r.score}</div><div>
      <h1>${esc(version.project.name)}</h1>
      <div class="muted">Version ${version.number} · ${status} · ${r.counts.err} blocking, ${r.counts.warn} warnings, ${r.counts.ok} passed</div>
      <div class="muted">${version.project.client ? `Client: ${esc(version.project.client.name)} · ` : ""}Prepared by ${esc(version.project.workspace.brandName ?? version.project.workspace.owner?.name ?? version.project.workspace.name)} · ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
    </div></div>
    <h2>Approval</h2>
    <table>
      <tr><td class="muted">Project status</td><td>${version.project.status.replace("_", " ").toLowerCase()}</td></tr>
      <tr><td class="muted">Last decision</td><td>${approval ? `${esc(approval.reviewerName)} ${approval.decision === "APPROVED" ? "approved" : "requested changes"} on ${approval.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}${approval.note ? ` — ${esc(approval.note)}` : ""}` : "none yet"}</td></tr>
      <tr><td class="muted">Comments</td><td>${version._count.comments}</td></tr>
      <tr><td class="muted">Subject</td><td>${esc(version.subject ?? "—")}</td></tr>
      <tr><td class="muted">Size</td><td>${(version.htmlBytes / 1024).toFixed(1)} KB · ${version._count.assets} images</td></tr>
    </table>
    ${groups.map((g) => { const list = r.findings.filter((f) => f.group === g); return list.length ? `<h2>${label[g]}</h2><ul>${list.map((f) => `<li><span class="dot" style="background:${tone(f.tone)}"></span><div>${esc(f.text)}${f.details?.length ? `<div class="d">${f.details.map(esc).join("<br>")}</div>` : ""}</div></li>`).join("")}</ul>` : ""; }).join("")}
    ${!kit ? `<p class="muted">No brand kit on this client, so brand, legal and tracking checks were skipped.</p>` : ""}
    ${snapshot ? `<h2>Desktop render</h2><img class="shot" src="${esc(snapshot.url)}">` : ""}
    <div class="foot">Pre-flight report${version.project.workspace.hidePoweredBy ? "" : ` · Sendprova · ${esc(process.env.APP_URL ?? "")}`}</div>
  </body></html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" } });
    return { pdf: new Uint8Array(pdf), version };
  } finally {
    await browser.close();
  }
}

export function safeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 60);
}
