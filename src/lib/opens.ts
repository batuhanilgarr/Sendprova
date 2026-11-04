/** Guess the email client from the User-Agent that fetched the open pixel. */
export function detectClient(ua: string | null): string {
  const s = (ua ?? "").toLowerCase();
  if (!s) return "Unknown";
  if (s.includes("googleimageproxy")) return "Gmail (image proxy)";
  if (s.includes("yahoomailproxy") || s.includes("yahoo")) return "Yahoo Mail";
  if (s.includes("outlook-ios")) return "Outlook iOS";
  if (s.includes("outlook-android")) return "Outlook Android";
  if (s.includes("microsoft outlook") || s.includes("msoffice") || s.includes("ms-office")) return "Outlook desktop";
  if (s.includes("outlook.com") || s.includes("owa")) return "Outlook.com";
  if (s.includes("thunderbird")) return "Thunderbird";
  if (s.includes("iphone") && s.includes("mobile") && !s.includes("chrome")) return "iPhone Mail";
  if (s.includes("ipad") && !s.includes("chrome")) return "iPad Mail";
  if (s.includes("macintosh") && s.includes("applewebkit") && !s.includes("chrome") && !s.includes("safari/")) return "Apple Mail";
  if (s.includes("android")) return "Android";
  if (s.includes("windows")) return "Windows (browser)";
  if (s.includes("macintosh")) return "macOS (browser)";
  return "Other";
}

export function pixelUrl(deliveryId: string) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/t/o/${deliveryId}.gif`;
}

/** Append a 1x1 open-tracking pixel to the HTML (before </body>, else at the end). */
export function injectPixel(html: string, deliveryId: string) {
  const img = `<img src="${pixelUrl(deliveryId)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />`;
  const i = html.toLowerCase().lastIndexOf("</body>");
  return i === -1 ? html + img : html.slice(0, i) + img + html.slice(i);
}

export const GIF_1X1 = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
