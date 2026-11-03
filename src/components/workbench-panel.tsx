"use client";

import { PanelRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Right-hand panel of the workbench. A fixed aside on large screens,
 * a bottom sheet behind a floating button on smaller ones.
 */
export function WorkbenchPanel({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <aside className="hidden lg:block w-80 xl:w-88 shrink-0 border-l bg-card overflow-auto">{children}</aside>

      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <Sheet>
          <SheetTrigger render={<Button size="lg" className="shadow-lg" />}>
            <PanelRightIcon data-icon="inline-start" />
            Panel
            {summary}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-auto p-0 rounded-t-2xl">
            <SheetHeader className="sr-only">
              <SheetTitle>Kontroller ve gönderim</SheetTitle>
              <SheetDescription>Kontroller, görseller ve test gönderimi</SheetDescription>
            </SheetHeader>
            {children}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
