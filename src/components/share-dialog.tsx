"use client";

import { CheckIcon, CopyIcon, Link2Icon } from "lucide-react";
import { useState } from "react";
import { createShareAction, revokeShareAction } from "@/app/app/p/[id]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface ShareItem {
  id: string;
  url: string;
  createdAt: string;
  views: number;
}

export function ShareDialog({ projectId, shares }: { projectId: string; shares: ShareItem[] }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Link2Icon data-icon="inline-start" />
        <span className="hidden sm:inline">Paylaş</span>
        {shares.length > 0 && <span className="font-mono text-[11px] text-muted-foreground">{shares.length}</span>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paylaşım linki</DialogTitle>
          <DialogDescription>
            Giriş gerektirmez, salt okunur. Her zaman projenin son versiyonunu gösterir; istediğin an iptal edebilirsin.
          </DialogDescription>
        </DialogHeader>

        {shares.length === 0 ? (
          <p className="text-muted-foreground">Henüz link yok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Input readOnly value={s.url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <CopyButton text={s.url} />
                <form action={revokeShareAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <Button type="submit" variant="destructive" size="sm">
                    İptal
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={createShareAction} className="flex items-center justify-between gap-3 pt-2">
          <input type="hidden" name="projectId" value={projectId} />
          {shares.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {shares.reduce((n, s) => n + s.views, 0)} görüntülenme
            </span>
          )}
          <Button type="submit" size="sm" className="ml-auto">
            Yeni link oluştur
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Kopyala"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <CheckIcon className="text-ok" /> : <CopyIcon />}
    </Button>
  );
}
