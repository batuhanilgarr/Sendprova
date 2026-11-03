import * as cheerio from "cheerio";

export interface BrandKit {
  colors: string[];
  fonts: string[];
  footerText: string | null;
  physicalAddress: string | null;
  unsubscribeToken: string | null;
  utmTemplate: string | null;
  allowedDomains: string[];
}

export type Tone = "ok" | "warn" | "err";
export interface Finding {
  tone: Tone;
  text: string;
  /** Penalty subtracted from the send-ready score when this finding is not ok. */
  weight: number;
  group: "technical" | "brand" | "legal" | "tracking";
  details?: string[];
}

const HEX = /#(?:[0-9a-f]{3}){1,2}\b/gi;
const NEUTRAL = new Set(["#000", "#000000", "#fff", "#ffffff"]);

function normHex(h: string) {
  const v = h.toLowerCase();
  return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v;
}

function norm(s: string) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Brand, legal and tracking checks derived from the client's kit. */
export function brandChecks(html: string, kit: BrandKit): Finding[] {
  const $ = cheerio.load(html);
  const findings: Finding[] = [];
  const text = norm($("body").text());

  // ---- colors
  if (kit.colors.length) {
    const allowed = new Set(kit.colors.map(normHex));
    const used = new Map<string, number>();
    const sources = [$("[style]").map((_, el) => $(el).attr("style") ?? "").get(), $("style").map((_, el) => $(el).html() ?? "").get(), $("[bgcolor]").map((_, el) => $(el).attr("bgcolor") ?? "").get(), $("[color]").map((_, el) => $(el).attr("color") ?? "").get()].flat();
    for (const src of sources) for (const m of src.matchAll(HEX)) {
      const h = normHex(m[0]);
      if (NEUTRAL.has(h) || allowed.has(h)) continue;
      used.set(h, (used.get(h) ?? 0) + 1);
    }
    const off = [...used.entries()].sort((a, b) => b[1] - a[1]);
    findings.push(
      off.length
        ? { tone: "warn", weight: 6, group: "brand", text: `${off.length} color${off.length === 1 ? "" : "s"} outside the brand palette.`, details: off.slice(0, 6).map(([h, n]) => `${h} ×${n}`) }
        : { tone: "ok", weight: 0, group: "brand", text: "All colors are from the brand palette." },
    );
  }

  // ---- fonts
  if (kit.fonts.length) {
    const allowed = kit.fonts.map(norm);
    const used = new Set<string>();
    const css = [$("[style]").map((_, el) => $(el).attr("style") ?? "").get(), $("style").map((_, el) => $(el).html() ?? "").get(), $("font[face]").map((_, el) => `font-family:${$(el).attr("face")}`).get()].flat().join("\n");
    for (const m of css.matchAll(/font-family\s*:\s*([^;}"]+)/gi)) {
      const first = m[1].split(",")[0].replace(/['"]/g, "").trim();
      if (first && !allowed.some((a) => norm(first) === a)) used.add(first);
    }
    findings.push(
      used.size
        ? { tone: "warn", weight: 4, group: "brand", text: `${used.size} font${used.size === 1 ? "" : "s"} not in the brand kit.`, details: [...used].slice(0, 6) }
        : { tone: "ok", weight: 0, group: "brand", text: "Fonts match the brand kit." },
    );
  }

  // ---- legal
  if (kit.footerText) {
    const ok = text.includes(norm(kit.footerText));
    findings.push(ok ? { tone: "ok", weight: 0, group: "legal", text: "Required footer text is present." } : { tone: "err", weight: 15, group: "legal", text: "Required footer text is missing.", details: [kit.footerText] });
  }
  if (kit.physicalAddress) {
    const ok = text.includes(norm(kit.physicalAddress));
    findings.push(ok ? { tone: "ok", weight: 0, group: "legal", text: "Physical address is present." } : { tone: "err", weight: 15, group: "legal", text: "Physical address is missing.", details: [kit.physicalAddress] });
  }
  if (kit.unsubscribeToken) {
    const tok = kit.unsubscribeToken.toLowerCase();
    const ok = html.toLowerCase().includes(tok) || $("a[href*='unsubscribe' i]").length > 0;
    findings.push(ok ? { tone: "ok", weight: 0, group: "legal", text: "Unsubscribe link is present." } : { tone: "err", weight: 20, group: "legal", text: "No unsubscribe link found.", details: [`Expected ${kit.unsubscribeToken} or a link containing "unsubscribe"`] });
  }

  // ---- links: domains and UTM
  const links = $("a[href]")
    .map((_, el) => $(el).attr("href")?.trim() ?? "")
    .get()
    .filter((h) => /^https?:\/\//i.test(h));

  if (kit.allowedDomains.length) {
    const allowed = kit.allowedDomains.map((d) => d.toLowerCase().replace(/^www\./, ""));
    const foreign = new Set<string>();
    for (const h of links) {
      try {
        const host = new URL(h).hostname.toLowerCase().replace(/^www\./, "");
        if (!allowed.some((a) => host === a || host.endsWith(`.${a}`))) foreign.add(host);
      } catch {}
    }
    findings.push(
      foreign.size
        ? { tone: "warn", weight: 5, group: "tracking", text: `${foreign.size} link host${foreign.size === 1 ? "" : "s"} outside the allowed domains.`, details: [...foreign].slice(0, 6) }
        : { tone: "ok", weight: 0, group: "tracking", text: "All links point at allowed domains." },
    );
  }

  if (kit.utmTemplate) {
    const required = new URLSearchParams(kit.utmTemplate.replace(/^\?/, ""));
    const allowed = kit.allowedDomains.map((d) => d.toLowerCase().replace(/^www\./, ""));
    const missing: string[] = [];
    let checked = 0;
    for (const h of links) {
      try {
        const u = new URL(h);
        const host = u.hostname.toLowerCase().replace(/^www\./, "");
        // Only the client's own links need tracking; third-party links (social) are skipped.
        if (allowed.length && !allowed.some((a) => host === a || host.endsWith(`.${a}`))) continue;
        checked++;
        for (const [k, v] of required) {
          const got = u.searchParams.get(k);
          if (got === null || (v && !v.includes("{") && got !== v)) {
            missing.push(`${u.hostname}${u.pathname} (${k})`);
            break;
          }
        }
      } catch {}
    }
    findings.push(
      missing.length
        ? { tone: "warn", weight: 8, group: "tracking", text: `${missing.length} of ${checked} links missing UTM parameters.`, details: missing.slice(0, 6) }
        : { tone: "ok", weight: 0, group: "tracking", text: checked ? `UTM parameters present on all ${checked} tracked links.` : "No tracked links to check." },
    );
  }

  return findings;
}
