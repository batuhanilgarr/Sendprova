"use client";

import { FolderOpenIcon, UploadIcon, FileIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Collected {
  file: File;
  path: string;
}

/** Walk dropped DataTransfer items, including folders, into flat {file, path} pairs. */
async function collectFromDataTransfer(dt: DataTransfer): Promise<Collected[]> {
  const out: Collected[] = [];
  const items = Array.from(dt.items ?? []);
  const entries = items
    .map((it) => (typeof it.webkitGetAsEntry === "function" ? it.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e);

  if (entries.length === 0) {
    for (const f of Array.from(dt.files)) out.push({ file: f, path: f.webkitRelativePath || f.name });
    return out;
  }

  const walk = async (entry: FileSystemEntry, prefix: string) => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ file, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns in batches; loop until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (batch.length === 0) break;
        for (const child of batch) await walk(child, prefix + entry.name + "/");
      }
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}

export function DropZone() {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const dirInput = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    async (files: Collected[], pasted?: string) => {
      setError(null);
      setBusy(files.length ? `Uploading ${files.length} file${files.length === 1 ? "" : "s"}…` : "Processing…");
      const form = new FormData();
      for (const { file, path } of files) {
        form.append("files", file);
        form.append("paths", path);
      }
      if (pasted) form.append("source", pasted);
      try {
        const res = await fetch("/api/ingest", { method: "POST", body: form });
        const data = (await res.json()) as { projectId?: string; error?: string };
        if (!res.ok || !data.projectId) throw new Error(data.error ?? "Upload failed");
        router.push(`/app/p/${data.projectId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBusy(null);
      }
    },
    [router],
  );

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = await collectFromDataTransfer(e.dataTransfer);
    if (files.length === 0) {
      const text = e.dataTransfer.getData("text/plain");
      if (text.trim()) return submit([], text);
      return setError("Dropped content was not recognized.");
    }
    submit(files);
  };

  const onPick = (list: FileList | null) => {
    if (!list?.length) return;
    submit(Array.from(list).map((f) => ({ file: f, path: f.webkitRelativePath || f.name })));
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={[
          "relative rounded-2xl border-2 border-dashed px-6 py-10 sm:py-14 text-center transition-colors",
          over ? "border-primary bg-primary/5" : "border-border bg-card",
        ].join(" ")}
      >
        <div className="mx-auto mb-4 size-11 rounded-xl bg-muted grid place-items-center text-muted-foreground">
          <UploadIcon className="size-5" />
        </div>
        <p className="font-medium text-[15px]">Drop your HTML, MJML, images or the whole folder here</p>
        <p className="text-muted-foreground mt-1 max-w-md mx-auto">
          Zip files work too. Images are hosted automatically and <code className="font-mono">src</code> paths are rewritten.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <FileIcon data-icon="inline-start" />
            Choose files
          </Button>
          <Button variant="outline" onClick={() => dirInput.current?.click()}>
            <FolderOpenIcon data-icon="inline-start" />
            Choose folder
          </Button>
        </div>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
        <input
          ref={dirInput}
          type="file"
          hidden
          // @ts-expect-error non-standard but supported by every major browser
          webkitdirectory=""
          onChange={(e) => onPick(e.target.files)}
        />
        {busy && (
          <div className="absolute inset-0 rounded-2xl bg-card/80 backdrop-blur-sm grid place-items-center text-muted-foreground">
            {busy}
          </div>
        )}
      </div>

      <details className="group rounded-xl border bg-card">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-muted-foreground group-open:border-b">
          or paste the source
        </summary>
        <div className="p-3 flex flex-col gap-2">
          <Textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            placeholder="<html>…</html> or <mjml>…</mjml>"
            className="font-mono text-xs min-h-40"
          />
          <div className="flex justify-end">
            <Button disabled={!source.trim() || !!busy} onClick={() => submit([], source)}>
              Preview
            </Button>
          </div>
        </div>
      </details>

      {error && <p className="text-err">{error}</p>}
    </div>
  );
}
