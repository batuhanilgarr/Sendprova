import { chromium, type Browser } from "playwright";
import { db } from "./db";
import { putAsset } from "./storage";

/** Same widths as the preview component; mobile emulates client zoom-to-fit. */
export const SNAPSHOT_DEVICES = {
  desktop: { width: 1000, shrink: false },
  mobile: { width: 390, shrink: true },
} as const;
export type SnapshotDevice = keyof typeof SNAPSHOT_DEVICES;

let browserPromise: Promise<Browser> | null = null;
function browser() {
  browserPromise ??= chromium.launch({ headless: true });
  return browserPromise;
}

/** Render one version at one width to a full-page PNG. */
export async function renderSnapshot(html: string, device: SnapshotDevice) {
  const { width, shrink } = SNAPSHOT_DEVICES[device];
  const b = await browser();

  // Measure the natural content width first; a fixed-width table email is
  // usually wider than a phone.
  let contentWidth: number = width;
  if (shrink) {
    const probe = await b.newPage({ viewport: { width, height: 800 } });
    try {
      await probe.setContent(html, { waitUntil: "load" });
      contentWidth = await probe.evaluate(() => document.documentElement.scrollWidth);
    } finally {
      await probe.close();
    }
  }

  // Mobile clients shrink the whole email to fit the screen. Rendering at the
  // content width with a fractional device scale factor is exactly that.
  const scale = shrink && contentWidth > width ? width / contentWidth : 1;
  const page = await b.newPage({ viewport: { width: Math.max(width, contentWidth), height: 800 }, deviceScaleFactor: scale });
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => {
      document.body.style.margin ||= "0";
      return Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })));
    });
    const png = await page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    return { png, width: Math.round(Math.max(width, contentWidth) * scale), height: Math.round(scrollHeight * scale) };
  } finally {
    await page.close();
  }
}

/** Returns the stored snapshot for a version/device, rendering it on first use. */
export async function ensureSnapshot(versionId: string, device: SnapshotDevice) {
  const existing = await db.snapshot.findUnique({ where: { versionId_device: { versionId, device } } });
  if (existing) return existing;
  const version = await db.version.findUniqueOrThrow({ where: { id: versionId }, select: { html: true, projectId: true } });
  const { png, width, height } = await renderSnapshot(version.html, device);
  const url = await putAsset(`${version.projectId}/${versionId}/_snapshots/${device}.png`, new Uint8Array(png), "image/png");
  return db.snapshot.create({ data: { versionId, device, url, width, height } });
}
