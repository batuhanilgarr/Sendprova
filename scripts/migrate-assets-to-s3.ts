/**
 * One-off: copy every asset stored by the `local` driver into the configured
 * S3/R2 bucket and rewrite Asset.url plus the hosted URLs inside Version.html.
 * Safe to re-run; already-migrated assets are skipped.
 *
 *   STORAGE_DRIVER=s3 pnpm tsx scripts/migrate-assets-to-s3.ts [--dry]
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { assetExists, LOCAL_ASSET_ROOT, publicUrlFor, putAsset, storageDriver } from "../src/lib/storage";

const dry = process.argv.includes("--dry");

async function main() {
  if (storageDriver !== "s3") throw new Error("Run with STORAGE_DRIVER=s3 and the S3_* variables set.");

  const assets = await db.asset.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`${assets.length} assets, ${dry ? "dry run" : "migrating"}`);

  const urlMap = new Map<string, string>();
  let uploaded = 0;
  let skipped = 0;
  let missing = 0;

  for (const a of assets) {
    const target = publicUrlFor(a.key);
    if (a.url === target) {
      skipped++;
      continue;
    }
    if (!(await assetExists(a.key))) {
      const file = path.join(LOCAL_ASSET_ROOT, a.key);
      let body: Buffer;
      try {
        body = await readFile(file);
      } catch {
        console.warn(`missing on disk: ${a.key}`);
        missing++;
        continue;
      }
      if (!dry) await putAsset(a.key, new Uint8Array(body), a.mime);
      uploaded++;
    }
    urlMap.set(a.url, target);
    if (!dry) await db.asset.update({ where: { id: a.id }, data: { url: target } });
  }

  // Rewrite hosted URLs inside every version's HTML.
  const versions = await db.version.findMany({ select: { id: true, html: true } });
  let rewritten = 0;
  for (const v of versions) {
    let html = v.html;
    for (const [from, to] of urlMap) html = html.split(from).join(to);
    if (html !== v.html) {
      rewritten++;
      if (!dry) await db.version.update({ where: { id: v.id }, data: { html } });
    }
  }

  console.log(`uploaded ${uploaded}, skipped ${skipped}, missing ${missing}, versions rewritten ${rewritten}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
