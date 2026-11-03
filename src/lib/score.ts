import { brandChecks, type BrandKit, type Finding } from "./brand-checks";
import type { CheckResult } from "./checks";

const GMAIL_CLIP_BYTES = 102 * 1024;

export interface ScoreInput {
  html: string;
  htmlBytes: number;
  assetCount: number;
  missingAssets: string[];
  placeholders: string[];
  live: CheckResult | null;
  kit: BrandKit | null;
}

export interface ScoreResult {
  score: number;
  findings: Finding[];
  counts: Record<"ok" | "warn" | "err", number>;
  /** Items that make the email not ready regardless of score (hard blockers). */
  blockers: Finding[];
}

/** Technical, brand, legal and tracking findings with a 0–100 send-ready score. */
export function sendReadyScore(input: ScoreInput): ScoreResult {
  const f: Finding[] = [];
  const kb = input.htmlBytes / 1024;

  f.push(
    input.htmlBytes > GMAIL_CLIP_BYTES
      ? { tone: "warn", weight: 10, group: "technical", text: `HTML is ${kb.toFixed(1)} KB; Gmail clips messages over 102 KB.` }
      : { tone: "ok", weight: 0, group: "technical", text: `HTML is ${kb.toFixed(1)} KB, under the Gmail limit.` },
    input.missingAssets.length
      ? { tone: "err", weight: 20, group: "technical", text: `${input.missingAssets.length} image reference${input.missingAssets.length === 1 ? "" : "s"} could not be matched.`, details: input.missingAssets.slice(0, 6) }
      : { tone: "ok", weight: 0, group: "technical", text: `${input.assetCount} image${input.assetCount === 1 ? "" : "s"} hosted, all references matched.` },
    input.placeholders.length
      ? { tone: "warn", weight: 2, group: "technical", text: `${input.placeholders.length} placeholder${input.placeholders.length === 1 ? "" : "s"} found; sent as-is in test sends.`, details: input.placeholders.slice(0, 6) }
      : { tone: "ok", weight: 0, group: "technical", text: "No placeholders." },
    /charset=.*utf-8|<meta[^>]+charset=["']?utf-8/i.test(input.html)
      ? { tone: "ok", weight: 0, group: "technical", text: "UTF-8 charset declared." }
      : { tone: "warn", weight: 5, group: "technical", text: "No UTF-8 charset declared; accented and non-Latin characters may break." },
  );

  if (input.live) {
    const badLinks = input.live.links.filter((l) => !l.ok);
    const badImages = input.live.images.filter((i) => !i.ok);
    f.push(
      badLinks.length
        ? { tone: "err", weight: 20, group: "technical", text: `${badLinks.length} of ${input.live.links.length} links do not respond.`, details: badLinks.slice(0, 6).map((l) => `${l.status ?? "✕"} ${l.url}`) }
        : { tone: "ok", weight: 0, group: "technical", text: `${input.live.links.length} links checked, all working.` },
      badImages.length
        ? { tone: "err", weight: 20, group: "technical", text: `${badImages.length} of ${input.live.images.length} images fail to load.`, details: badImages.slice(0, 6).map((i) => `${i.status ?? "✕"} ${i.url}`) }
        : { tone: "ok", weight: 0, group: "technical", text: `${input.live.images.length} images reachable, ${(input.live.totalImageBytes / 1024).toFixed(0)} KB total.` },
      input.live.altMissing.length
        ? { tone: "warn", weight: 4, group: "technical", text: `${input.live.altMissing.length} image${input.live.altMissing.length === 1 ? "" : "s"} without alt text.`, details: input.live.altMissing.slice(0, 6).map((s) => s.split("/").pop() ?? s) }
        : { tone: "ok", weight: 0, group: "technical", text: "All visible images have alt text." },
    );
    if (input.live.totalImageBytes > 1024 * 1024) f.push({ tone: "warn", weight: 5, group: "technical", text: "Images exceed 1 MB; slow to open on mobile." });
  } else {
    f.push({ tone: "warn", weight: 10, group: "technical", text: "Links and images not checked yet. Run “Check links”." });
  }

  if (input.kit) f.push(...brandChecks(input.html, input.kit));

  const penalty = f.reduce((s, x) => s + (x.tone === "ok" ? 0 : x.weight), 0);
  const counts = { ok: 0, warn: 0, err: 0 };
  for (const x of f) counts[x.tone]++;
  return { score: Math.max(0, 100 - penalty), findings: f, counts, blockers: f.filter((x) => x.tone === "err") };
}

export function kitFromClient(c: { colors: string[]; fonts: string[]; footerText: string | null; physicalAddress: string | null; unsubscribeToken: string | null; utmTemplate: string | null; allowedDomains: string[] } | null | undefined): BrandKit | null {
  if (!c) return null;
  const empty = !c.colors.length && !c.fonts.length && !c.footerText && !c.physicalAddress && !c.unsubscribeToken && !c.utmTemplate && !c.allowedDomains.length;
  return empty ? null : { colors: c.colors, fonts: c.fonts, footerText: c.footerText, physicalAddress: c.physicalAddress, unsubscribeToken: c.unsubscribeToken, utmTemplate: c.utmTemplate, allowedDomains: c.allowedDomains };
}
