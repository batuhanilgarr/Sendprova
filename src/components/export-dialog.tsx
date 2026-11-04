"use client";

import { CheckIcon, CopyIcon, DownloadIcon, PackageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const PROFILES: { id: string; label: string }[] = [
  { id: "generic", label: "Plain HTML" },
  { id: "mailchimp", label: "Mailchimp" },
  { id: "brevo", label: "Brevo" },
  { id: "sfmc", label: "Salesforce Marketing Cloud" },
  { id: "customerio", label: "Customer.io" },
  { id: "hubspot", label: "HubSpot" },
];

interface Preview {
  mapped: { from: string; to: string }[];
  unmapped: string[];
  bytes: number;
}

export function ExportDialog({ versionId }: { versionId: string }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState("generic");
  const [inline, setInline] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const qs = `profile=${profile}&inline=${inline ? 1 : 0}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/versions/${versionId}/export?${qs}`, { headers: { accept: "application/json" } })
      .then((r) => r.json())
      .then((d: Preview) => {
        if (!cancelled) setPreview(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, versionId, qs]);

  async function copy() {
    const res = await fetch(`/api/versions/${versionId}/export?${qs}`);
    await navigator.clipboard.writeText(await res.text());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <DownloadIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Export</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export for your ESP</DialogTitle>
          <DialogDescription>Placeholders are converted to the platform&apos;s syntax, CSS is inlined, images stay on the CDN.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Platform</Label>
            <select value={profile} onChange={(e) => setProfile(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30">
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={inline} onCheckedChange={(v) => setInline(!!v)} /> Inline CSS (keeps a &lt;style&gt; block for media queries)
          </Label>

          {preview && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <div className="text-muted-foreground">{(preview.bytes / 1024).toFixed(1)} KB after export</div>
              {preview.mapped.length > 0 && (
                <ul className="mt-1 font-mono">
                  {preview.mapped.map((m) => (
                    <li key={m.from}>
                      {m.from} → <span className="text-ok">{m.to}</span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.unmapped.length > 0 && (
                <p className="mt-1 text-warn font-mono">Left as-is: {preview.unmapped.join(", ")}</p>
              )}
              {preview.mapped.length === 0 && preview.unmapped.length === 0 && <p className="mt-1 text-muted-foreground">No placeholders to convert.</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={copy}>
              {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
              {copied ? "Copied" : "Copy HTML"}
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/versions/${versionId}/export?${qs}&download=1`} />}>
              <DownloadIcon data-icon="inline-start" />
              Download HTML
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/versions/${versionId}/pack.zip?profile=${profile}`} />}>
              <PackageIcon data-icon="inline-start" />
              Delivery pack (.zip)
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">The pack bundles HTML, images, plain text, the pre-flight PDF and the approval record for hand-off or archiving.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
