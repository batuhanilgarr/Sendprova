import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Asset storage.
 *  - `local`: writes under .data/assets and the app serves the files from /assets/<key>.
 *    Fine for development; inboxes on other machines cannot load these images.
 *  - `s3`: any S3-compatible bucket. Cloudflare R2 is the intended production target
 *    (zero egress, public bucket via r2.dev or a custom domain).
 */
export const storageDriver: "local" | "s3" = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";

export const LOCAL_ASSET_ROOT = path.resolve(process.cwd(), ".data/assets");

const bucket = process.env.S3_BUCKET ?? "sendprova-assets";
const s3PublicUrl = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

let client: S3Client | undefined;

export function s3() {
  if (!client) {
    const missing = ["S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_PUBLIC_URL"].filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`STORAGE_DRIVER=s3 but ${missing.join(", ")} not set`);
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "auto",
      forcePathStyle: true, // R2 and MinIO both expect path-style with a custom endpoint
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });
  }
  return client;
}

export function publicUrlFor(key: string) {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return storageDriver === "s3" ? `${s3PublicUrl}/${encoded}` : `${appUrl}/assets/${encoded}`;
}

export async function putAsset(key: string, body: Uint8Array, contentType: string): Promise<string> {
  if (storageDriver === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return publicUrlFor(key);
  }
  const file = path.join(LOCAL_ASSET_ROOT, key);
  if (!file.startsWith(LOCAL_ASSET_ROOT + path.sep)) throw new Error("Invalid asset key");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return publicUrlFor(key);
}

export async function assetExists(key: string) {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export const s3Bucket = bucket;

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  css: "text/css",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
};

export function mimeFor(p: string) {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}
