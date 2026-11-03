import { ingest, type IncomingFile } from "../../../lib/ingest";

export const maxDuration = 60;

/**
 * multipart/form-data:
 *   files   – repeated File fields
 *   paths   – repeated relative paths, parallel to `files`
 *   source  – pasted HTML/MJML (optional)
 *   name    – project name (optional)
 *   projectId – existing project to add a version to (optional)
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const blobs = form.getAll("files").filter((v): v is File => v instanceof File);
  const paths = form.getAll("paths").map(String);

  const files: IncomingFile[] = [];
  for (let i = 0; i < blobs.length; i++) {
    files.push({ path: paths[i] || blobs[i].name, bytes: new Uint8Array(await blobs[i].arrayBuffer()) });
  }

  try {
    const result = await ingest({
      files,
      pastedSource: form.get("source")?.toString(),
      projectName: form.get("name")?.toString(),
      projectId: form.get("projectId")?.toString() || undefined,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yükleme başarısız";
    return Response.json({ error: message }, { status: 400 });
  }
}
