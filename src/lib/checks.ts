import * as cheerio from "cheerio";
import { z } from "zod";
import { db } from "./db";

export const checkResultSchema = z.object({
  links: z.array(z.object({ url: z.string(), status: z.number().nullable(), ok: z.boolean(), finalUrl: z.string().optional(), error: z.string().optional() })),
  images: z.array(z.object({ url: z.string(), status: z.number().nullable(), ok: z.boolean(), bytes: z.number().nullable(), contentType: z.string().nullable() })),
  altMissing: z.array(z.string()),
  totalImageBytes: z.number(),
});
export type CheckResult = z.infer<typeof checkResultSchema>;

const PLACEHOLDER = /[{%*\[]|\*\|/;

async function probe(url: string, method: "HEAD" | "GET", timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "Sendprova link checker/0.1" },
    });
  } finally {
    clearTimeout(t);
  }
}

/** HEAD first; many CDNs reject HEAD so fall back to a GET that is aborted after headers. */
async function checkUrl(url: string) {
  try {
    let res = await probe(url, "HEAD");
    if (res.status === 405 || res.status === 403 || res.status === 501) res = await probe(url, "GET");
    const bytes = Number(res.headers.get("content-length")) || null;
    const contentType = res.headers.get("content-type");
    if (res.body) void res.body.cancel();
    return { status: res.status, ok: res.ok, finalUrl: res.url !== url ? res.url : undefined, bytes, contentType };
  } catch (err) {
    const error = err instanceof Error ? (err.name === "AbortError" ? "zaman aşımı" : err.message) : String(err);
    return { status: null, ok: false, bytes: null, contentType: null, error };
  }
}

export function extractTargets(html: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  const images = new Set<string>();
  const altMissing: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() ?? "";
    if (/^https?:\/\//i.test(href) && !PLACEHOLDER.test(href)) links.add(href);
  });
  $("img").each((_, el) => {
    const src = $(el).attr("src")?.trim() ?? "";
    if (/^https?:\/\//i.test(src)) images.add(src);
    const alt = $(el).attr("alt");
    // Spacer / tracking pixels legitimately have alt="". Only flag a missing attribute on visible images.
    const w = Number($(el).attr("width") ?? 0);
    const h = Number($(el).attr("height") ?? 0);
    if (alt === undefined && !(w <= 1 && h <= 1)) altMissing.push(src || "(src yok)");
  });
  return { links: [...links], images: [...images], altMissing };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export async function runChecks(versionId: string): Promise<CheckResult> {
  const version = await db.version.findUniqueOrThrow({ where: { id: versionId }, select: { html: true } });
  const targets = extractTargets(version.html);

  const [links, images] = await Promise.all([
    mapLimit(targets.links, 6, async (url) => {
      const r = await checkUrl(url);
      return { url, status: r.status, ok: r.ok, finalUrl: r.finalUrl, error: r.error };
    }),
    mapLimit(targets.images, 6, async (url) => {
      const r = await checkUrl(url);
      return { url, status: r.status, ok: r.ok, bytes: r.bytes, contentType: r.contentType };
    }),
  ]);

  const result: CheckResult = {
    links,
    images,
    altMissing: targets.altMissing,
    totalImageBytes: images.reduce((s, i) => s + (i.bytes ?? 0), 0),
  };
  await db.checkRun.create({ data: { versionId, result } });
  return result;
}
