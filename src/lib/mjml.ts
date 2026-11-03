import mjml2html from "mjml";

export function isMjml(source: string) {
  return /<mjml[\s>]/i.test(source);
}

export async function compileMjml(source: string) {
  const { html, errors } = await mjml2html(source, { validationLevel: "soft", keepComments: false });
  return { html, errors: errors.map((e) => `${e.tagName} line ${e.line}: ${e.message}`) };
}
