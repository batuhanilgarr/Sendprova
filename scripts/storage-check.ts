/**
 * Uploads a 1x1 PNG through the configured storage driver and fetches it back
 * over HTTP, so you know inboxes will be able to load images.
 *
 *   pnpm storage:check
 */
import "dotenv/config";
import { putAsset, storageDriver } from "../src/lib/storage";

const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

async function main() {
  console.log(`driver: ${storageDriver}`);
  const key = `_healthcheck/${Date.now()}.png`;
  const url = await putAsset(key, new Uint8Array(PNG_1X1), "image/png");
  console.log(`uploaded: ${url}`);

  const res = await fetch(url);
  const type = res.headers.get("content-type");
  const cache = res.headers.get("cache-control");
  console.log(`fetch: ${res.status} ${type} cache-control=${cache ?? "-"}`);
  if (!res.ok) {
    console.error("The uploaded file is not publicly readable. For R2: enable public access (r2.dev subdomain or custom domain) and set S3_PUBLIC_URL to it.");
    process.exit(1);
  }
  if (type !== "image/png") {
    console.error(`Unexpected content-type ${type}; email clients may refuse to render it.`);
    process.exit(1);
  }
  console.log("ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
