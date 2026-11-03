import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Asset storage. `local` writes under .data/assets and the app serves the files
 * from /assets/<key>; `s3` uploads to any S3-compatible bucket (R2, S3, MinIO).
 */
const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";

export const LOCAL_ASSET_ROOT = path.resolve(process.cwd(), ".data/assets");

const bucket = process.env.S3_BUCKET ?? "mailing-assets";
const s3PublicUrl = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

let client: S3Client | undefined;

function s3() {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "auto",
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });
  return client;
}

export async function putAsset(key: string, body: Uint8Array, contentType: string): Promise<string> {
  if (driver === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${s3PublicUrl}/${key}`;
  }
  const file = path.join(LOCAL_ASSET_ROOT, key);
  if (!file.startsWith(LOCAL_ASSET_ROOT + path.sep)) throw new Error("Invalid asset key");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return `${appUrl}/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}

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
