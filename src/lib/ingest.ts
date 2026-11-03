import JSZip from "jszip";
import path from "node:path/posix";
import { db, defaultWorkspace } from "./db";
import { isMjml, compileMjml } from "./mjml";
import { detectPlaceholders, normalizeRef, rewriteAssetRefs, type AssetUrlMap } from "./html/rewrite";
import { mimeFor, putAsset } from "./storage";

export interface IncomingFile {
  /** Path relative to the dropped root, forward slashes. */
  path: string;
  bytes: Uint8Array;
}

export interface IngestInput {
  files: IncomingFile[];
  /** Pasted source when no HTML file is dropped. */
  pastedSource?: string;
  projectName?: string;
  /** Add a new version to an existing project instead of creating one. */
  projectId?: string;
}

const SOURCE_EXT = new Set([".html", ".htm", ".mjml"]);
const IGNORED = /(^|\/)(__MACOSX|\.DS_Store|\.idea|\.git|thumbs\.db|node_modules)(\/|$)/i;

function cleanPath(p: string) {
  return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}

/** Expand any .zip files into their entries. */
async function expandZips(files: IncomingFile[]): Promise<IncomingFile[]> {
  const out: IncomingFile[] = [];
  for (const f of files) {
    if (!f.path.toLowerCase().endsWith(".zip")) {
      out.push({ ...f, path: cleanPath(f.path) });
      continue;
    }
    const zip = await JSZip.loadAsync(f.bytes);
    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;
      out.push({ path: cleanPath(entry.name), bytes: await entry.async("uint8array") });
    }
  }
  return out.filter((f) => !IGNORED.test(f.path));
}

/** Strip a common leading folder (zip of a folder, dropped folder). */
function stripCommonRoot(files: IncomingFile[]): IncomingFile[] {
  if (files.length === 0) return files;
  const first = files[0].path.split("/");
  if (first.length < 2) return files;
  const root = first[0] + "/";
  if (!files.every((f) => f.path.startsWith(root))) return files;
  return files.map((f) => ({ ...f, path: f.path.slice(root.length) }));
}

function pickSource(files: IncomingFile[]) {
  const candidates = files.filter((f) => SOURCE_EXT.has(path.extname(f.path).toLowerCase()));
  if (candidates.length === 0) return undefined;
  // Prefer index.html, then the shallowest file.
  candidates.sort((a, b) => {
    const ai = /(^|\/)index\.(html?|mjml)$/i.test(a.path) ? 0 : 1;
    const bi = /(^|\/)index\.(html?|mjml)$/i.test(b.path) ? 0 : 1;
    if (ai !== bi) return ai - bi;
    return a.path.split("/").length - b.path.split("/").length;
  });
  return candidates[0];
}

export async function ingest(input: IngestInput) {
  const files = stripCommonRoot(await expandZips(input.files));
  const sourceFile = pickSource(files);

  let source: string;
  let htmlDir = "";
  if (sourceFile) {
    source = new TextDecoder("utf-8").decode(sourceFile.bytes);
    htmlDir = path.dirname(sourceFile.path);
    if (htmlDir === ".") htmlDir = "";
  } else if (input.pastedSource?.trim()) {
    source = input.pastedSource;
  } else {
    throw new Error("HTML veya MJML kaynağı bulunamadı. Bir .html/.mjml dosyası bırakın ya da kaynağı yapıştırın.");
  }

  const workspace = await defaultWorkspace();
  const project = input.projectId
    ? await db.project.findUniqueOrThrow({ where: { id: input.projectId } })
    : await db.project.create({
        data: {
          workspaceId: workspace.id,
          name: input.projectName?.trim() || titleFrom(source) || sourceFile?.path || "Adsız mailing",
        },
      });

  const last = await db.version.findFirst({ where: { projectId: project.id }, orderBy: { number: "desc" } });
  const number = (last?.number ?? 0) + 1;
  const version = await db.version.create({
    data: { projectId: project.id, number, source, html: "", htmlBytes: 0 },
  });

  // Upload every non-source file as an asset.
  const assetUrls: AssetUrlMap = new Map();
  const assetRows = [];
  for (const f of files) {
    if (f === sourceFile) continue;
    if (SOURCE_EXT.has(path.extname(f.path).toLowerCase())) continue;
    const key = `${project.id}/${version.id}/${f.path}`;
    const mime = mimeFor(f.path);
    const url = await putAsset(key, f.bytes, mime);
    assetUrls.set(normalizeRef(f.path), url);
    assetRows.push({ versionId: version.id, path: f.path, key, url, mime, bytes: f.bytes.byteLength });
  }
  if (assetRows.length) await db.asset.createMany({ data: assetRows });

  const sourceKind = isMjml(source) ? "MJML" : "HTML";
  const compiled = sourceKind === "MJML" ? (await compileMjml(source)).html : source;
  const rewritten = rewriteAssetRefs(compiled, assetUrls, htmlDir);
  const html = rewritten.html;

  await db.version.update({
    where: { id: version.id },
    data: {
      sourceKind,
      html,
      htmlBytes: Buffer.byteLength(html, "utf8"),
      subject: titleFrom(source) ?? undefined,
      placeholders: detectPlaceholders(html),
      missingAssets: rewritten.missing,
    },
  });
  await db.project.update({ where: { id: project.id }, data: { updatedAt: new Date() } });

  return { projectId: project.id, versionId: version.id, number };
}

function titleFrom(source: string) {
  const m = source.match(/<title>([\s\S]*?)<\/title>/i) ?? source.match(/<mj-title>([\s\S]*?)<\/mj-title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : undefined;
}
