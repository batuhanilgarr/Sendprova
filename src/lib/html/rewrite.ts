import * as cheerio from "cheerio";
import path from "node:path/posix";

/** Map of normalized relative asset path → public URL. */
export type AssetUrlMap = Map<string, string>;

export interface RewriteResult {
  html: string;
  /** Relative references that had no uploaded file. */
  missing: string[];
  /** Relative references that were replaced. */
  replaced: string[];
}

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const PLACEHOLDER = /^[{%*\[]/;

/** Normalize a reference relative to the HTML file's directory. */
export function normalizeRef(ref: string, htmlDir = ""): string {
  const clean = ref.trim().replace(/\\/g, "/").split(/[?#]/)[0];
  return path.normalize(path.join(htmlDir, clean)).replace(/^\.\//, "").toLowerCase();
}

export function isRelativeRef(ref: string) {
  const v = ref.trim();
  return v !== "" && !ABSOLUTE.test(v) && !PLACEHOLDER.test(v) && !v.startsWith("data:") && !v.startsWith("cid:");
}

/**
 * Replace relative image / background references in HTML with hosted URLs.
 * Covers <img src>, [background], <table|td background>, inline style url(...),
 * <style> url(...), and VML <v:fill src> / <v:image src> used by Outlook.
 */
export function rewriteAssetRefs(html: string, assets: AssetUrlMap, htmlDir = ""): RewriteResult {
  const $ = cheerio.load(html, { xml: false });
  const missing = new Set<string>();
  const replaced = new Set<string>();

  const resolve = (ref: string): string | null => {
    if (!isRelativeRef(ref)) return null;
    const key = normalizeRef(ref, htmlDir);
    const url = assets.get(key);
    if (url) {
      replaced.add(ref);
      return url;
    }
    missing.add(ref);
    return null;
  };

  const rewriteUrlFunctions = (css: string) =>
    css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q: string, ref: string) => {
      const url = resolve(ref);
      return url ? `url(${q}${url}${q})` : m;
    });

  for (const attr of ["src", "background", "poster"]) {
    $(`[${attr}]`).each((_, el) => {
      const ref = $(el).attr(attr);
      if (!ref) return;
      const url = resolve(ref);
      if (url) $(el).attr(attr, url);
    });
  }

  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    if (style && /url\(/i.test(style)) $(el).attr("style", rewriteUrlFunctions(style));
  });

  $("style").each((_, el) => {
    const css = $(el).html();
    if (css && /url\(/i.test(css)) $(el).html(rewriteUrlFunctions(css));
  });

  return { html: $.html(), missing: [...missing], replaced: [...replaced] };
}

const PLACEHOLDER_PATTERNS = [
  /\{\{\s*[\w.|: -]+\s*\}\}/g, // {{ first_name }}
  /\{[\w.-]+\}/g, // {unsubscribelink}
  /\*\|[\w:-]+\|\*/g, // *|FNAME|* (Mailchimp)
  /%%[\w.-]+%%/g, // %%first_name%% (SFMC)
  /\[\[[\w.-]+\]\]/g, // [[name]]
];

export function detectPlaceholders(html: string): string[] {
  const found = new Set<string>();
  for (const re of PLACEHOLDER_PATTERNS) {
    for (const m of html.matchAll(re)) found.add(m[0]);
  }
  return [...found].sort();
}
