import JSZip from "jszip";
import { db } from "@/lib/db";
import { ESP_PROFILES, exportHtml, type EspProfile } from "@/lib/export";
import { htmlToText } from "@/lib/mailer";
import { renderPreflightPdf, safeFileName } from "@/lib/preflight-pdf";
import { listComments, latestApproval } from "@/lib/review";
import { requireVersionAccess } from "@/lib/session";

export const maxDuration = 120;

/**
 * Delivery pack: ESP-ready HTML, a copy with local image paths plus the images,
 * plain-text version, pre-flight PDF and the approval record.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/versions/[id]/pack.zip">) {
  const { id } = await ctx.params;
  const access = await requireVersionAccess(id);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const profile = (url.searchParams.get("profile") ?? "generic") as EspProfile;
  if (!(profile in ESP_PROFILES)) return new Response("Unknown profile", { status: 400 });

  const version = await db.version.findUniqueOrThrow({ where: { id }, include: { project: { include: { client: true } }, assets: true } });
  const [approval, threads, { pdf }] = await Promise.all([latestApproval(id), listComments(id), renderPreflightPdf(id)]);
  const exported = exportHtml(version.html, { profile, inlineCss: true });

  const zip = new JSZip();
  const base = `${safeFileName(version.project.name)}-v${version.number}`;
  zip.file("README.txt", [
    `${version.project.name} — version ${version.number}`,
    `Profile: ${ESP_PROFILES[profile].label}`,
    "",
    "index.html        ESP-ready HTML, CSS inlined, images on the CDN",
    "index-local.html  Same HTML with images pointing at ./images/ (for archiving)",
    "images/           Every hosted image of this version",
    "text.txt          Plain-text alternative",
    "preflight.pdf     Send-ready report",
    "approval.json     Decision, reviewer, comments",
    "",
    exported.mapped.length ? `Placeholders converted:\n${exported.mapped.map((m) => `  ${m.from} -> ${m.to}`).join("\n")}` : "No placeholders converted.",
    exported.unmapped.length ? `Left as-is (set them in your ESP):\n${exported.unmapped.map((p) => `  ${p}`).join("\n")}` : "",
  ].join("\n"));
  zip.file("index.html", exported.html);
  zip.file("text.txt", htmlToText(exported.html));
  zip.file("preflight.pdf", pdf);
  zip.file(
    "approval.json",
    JSON.stringify(
      {
        project: version.project.name,
        client: version.project.client?.name ?? null,
        version: version.number,
        status: version.project.status,
        decision: approval ? { decision: approval.decision, reviewer: approval.reviewerName, email: approval.reviewerEmail, note: approval.note, at: approval.createdAt } : null,
        comments: threads.map((t) => ({ by: t.authorName, at: t.createdAt, device: t.device, body: t.body, resolved: !!t.resolvedAt, replies: t.replies.map((r) => ({ by: r.authorName, at: r.createdAt, body: r.body })) })),
      },
      null,
      2,
    ),
  );

  // Images: download each hosted asset and produce a local-path copy of the HTML.
  let local = exported.html;
  const images = zip.folder("images")!;
  await Promise.all(
    version.assets.map(async (a) => {
      try {
        const res = await fetch(a.url);
        if (!res.ok) return;
        const file = a.path.split("/").pop() ?? a.path;
        images.file(file, await res.arrayBuffer());
        local = local.split(a.url).join(`images/${file}`);
      } catch {}
    }),
  );
  zip.file("index-local.html", local);

  const body = new Uint8Array(await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }));
  return new Response(body, {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${base}-${profile}.zip"`, "cache-control": "no-store" },
  });
}
