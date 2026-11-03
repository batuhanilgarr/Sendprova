import { diffLines } from "diff";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { db } from "./db";
import { htmlToText } from "./mailer";
import { ensureSnapshot, SNAPSHOT_DEVICES, type SnapshotDevice } from "./snapshots";
import { putAsset } from "./storage";

async function fetchPng(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load snapshot (${res.status})`);
  return PNG.sync.read(Buffer.from(await res.arrayBuffer()));
}

/** Pad both images to the same size so differing heights still diff cleanly. */
function pad(img: PNG, width: number, height: number) {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

/** Visual diff of `versionId` against `baseVersionId`, cached per device. */
export async function ensureVisualDiff(versionId: string, baseVersionId: string, device: SnapshotDevice) {
  const cached = await db.versionDiff.findUnique({ where: { versionId_baseVersionId_device: { versionId, baseVersionId, device } } });
  if (cached) return cached;

  const [a, b] = await Promise.all([ensureSnapshot(baseVersionId, device), ensureSnapshot(versionId, device)]);
  const [imgA, imgB] = await Promise.all([fetchPng(a.url), fetchPng(b.url)]);
  // A full-page capture can be a little wider than the viewport when content
  // overflows, so size the canvas to the larger of the two images.
  const width = Math.max(SNAPSHOT_DEVICES[device].width, imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);
  const pa = pad(imgA, width, height);
  const pb = pad(imgB, width, height);
  const out = new PNG({ width, height });
  const changed = pixelmatch(pa.data, pb.data, out.data, width, height, { threshold: 0.1, diffColor: [220, 38, 38], diffColorAlt: [234, 179, 8], alpha: 0.25 });
  const buf = PNG.sync.write(out);
  const version = await db.version.findUniqueOrThrow({ where: { id: versionId }, select: { projectId: true } });
  const diffUrl = await putAsset(`${version.projectId}/${versionId}/_diffs/${baseVersionId}-${device}.png`, new Uint8Array(buf), "image/png");
  return db.versionDiff.create({
    data: { versionId, baseVersionId, device, diffUrl, changedRatio: changed / (width * height), width, height },
  });
}

export interface TextDiffLine {
  type: "added" | "removed" | "same";
  text: string;
}

/** Line diff of the visible text, collapsing long unchanged runs. */
export function textDiff(baseHtml: string, html: string): { lines: TextDiffLine[]; added: number; removed: number } {
  const a = htmlToText(baseHtml);
  const b = htmlToText(html);
  const parts = diffLines(a, b);
  const lines: TextDiffLine[] = [];
  let added = 0;
  let removed = 0;
  for (const part of parts) {
    const rows = part.value.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
    const type: TextDiffLine["type"] = part.added ? "added" : part.removed ? "removed" : "same";
    if (type === "added") added += rows.length;
    if (type === "removed") removed += rows.length;
    if (type === "same" && rows.length > 4) {
      lines.push({ type, text: rows[0] }, { type, text: rows[1] }, { type: "same", text: `… ${rows.length - 4} unchanged lines …` }, { type, text: rows[rows.length - 2] }, { type, text: rows[rows.length - 1] });
      continue;
    }
    for (const r of rows) lines.push({ type, text: r });
  }
  return { lines, added, removed };
}
