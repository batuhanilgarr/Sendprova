import juice from "juice";
import { detectPlaceholders } from "./html/rewrite";

/** Target ESP. Each maps the semantic placeholders we recognise to the ESP's own syntax. */
export const ESP_PROFILES = {
  generic: { label: "Plain HTML", tokens: {} as Record<Semantic, string> },
  mailchimp: { label: "Mailchimp", tokens: { unsubscribe: "*|UNSUB|*", first_name: "*|FNAME|*", last_name: "*|LNAME|*", email: "*|EMAIL|*", view_in_browser: "*|ARCHIVE|*" } },
  brevo: { label: "Brevo", tokens: { unsubscribe: "{{ unsubscribe }}", first_name: "{{ contact.FIRSTNAME }}", last_name: "{{ contact.LASTNAME }}", email: "{{ contact.EMAIL }}", view_in_browser: "{{ mirror }}" } },
  sfmc: { label: "Salesforce Marketing Cloud", tokens: { unsubscribe: "%%unsub_center_url%%", first_name: "%%First_Name%%", last_name: "%%Last_Name%%", email: "%%emailaddr%%", view_in_browser: "%%view_email_url%%" } },
  customerio: { label: "Customer.io", tokens: { unsubscribe: "{{ unsubscribe_url }}", first_name: "{{ customer.first_name }}", last_name: "{{ customer.last_name }}", email: "{{ customer.email }}", view_in_browser: "{{ view_in_browser_url }}" } },
  hubspot: { label: "HubSpot", tokens: { unsubscribe: "{{ unsubscribe_link }}", first_name: "{{ contact.firstname }}", last_name: "{{ contact.lastname }}", email: "{{ contact.email }}", view_in_browser: "{{ view_as_page_url }}" } },
} as const;
export type EspProfile = keyof typeof ESP_PROFILES;
type Semantic = "unsubscribe" | "first_name" | "last_name" | "email" | "view_in_browser";

/** Guess what a source placeholder means from its name. */
export function classifyPlaceholder(raw: string): Semantic | null {
  const n = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (n.includes("unsub") || n.includes("optout")) return "unsubscribe";
  if (n.includes("firstname") || n === "fname" || n.includes("first")) return "first_name";
  if (n.includes("lastname") || n === "lname" || n.includes("surname")) return "last_name";
  if (n.includes("email")) return "email";
  if (n.includes("browser") || n.includes("mirror") || n.includes("webversion") || n.includes("archive")) return "view_in_browser";
  return null;
}

export interface ExportOptions {
  profile: EspProfile;
  inlineCss: boolean;
}

export interface ExportResult {
  html: string;
  /** Placeholder replacements that were applied. */
  mapped: { from: string; to: string }[];
  /** Placeholders we could not classify; left untouched. */
  unmapped: string[];
}

const PIXEL_RE = /<img[^>]+\/t\/o\/[A-Za-z0-9]+\.gif[^>]*>/gi;

export function exportHtml(source: string, opts: ExportOptions): ExportResult {
  let html = source.replace(PIXEL_RE, "");
  const tokens = ESP_PROFILES[opts.profile].tokens as Partial<Record<Semantic, string>>;
  const mapped: ExportResult["mapped"] = [];
  const unmapped: string[] = [];

  for (const ph of detectPlaceholders(html)) {
    const kind = classifyPlaceholder(ph);
    const to = kind ? tokens[kind] : undefined;
    if (!to || to === ph) {
      if (!kind || !to) unmapped.push(ph);
      continue;
    }
    html = html.split(ph).join(to);
    mapped.push({ from: ph, to });
  }

  if (opts.inlineCss) {
    html = juice(html, {
      preserveImportant: true,
      preserveMediaQueries: true,
      preserveFontFaces: true,
      removeStyleTags: false, // keep <style> for media queries / dark mode rules
      applyWidthAttributes: true,
      applyHeightAttributes: true,
      applyAttributesTableElements: true,
    });
  }

  return { html, mapped, unmapped };
}
