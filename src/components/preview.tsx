"use client";

import { ExternalLinkIcon, MessageSquarePlusIcon, MonitorIcon, MoonIcon, SmartphoneIcon, TabletIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEVICES = {
  desktop: { label: "Desktop", width: 1000, frame: false, Icon: MonitorIcon },
  tablet: { label: "Tablet", width: 768, frame: true, Icon: TabletIcon },
  mobile: { label: "Mobile", width: 390, frame: true, Icon: SmartphoneIcon },
} as const;
export type DeviceKey = keyof typeof DEVICES;

export interface PreviewPin {
  id: string;
  n: number;
  x: number;
  y: number;
  device: string | null;
  resolved: boolean;
}

export function Preview({
  src,
  pins = [],
  activePinId,
  onPinClick,
  onPlacePin,
  pinMode,
  onPinModeChange,
}: {
  src: string;
  pins?: PreviewPin[];
  activePinId?: string | null;
  onPinClick?: (id: string) => void;
  /** Called with fractional coordinates when the user clicks the preview in pin mode. */
  onPlacePin?: (p: { x: number; y: number; device: DeviceKey }) => void;
  pinMode?: boolean;
  onPinModeChange?: (on: boolean) => void;
}) {
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [fit, setFit] = useState(true);
  const [shrink, setShrink] = useState(true);
  const [height, setHeight] = useState(800);
  const [scale, setScale] = useState(1);
  const canvas = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);

  const width = DEVICES[device].width;
  // Frame border is inside the box (border-box), so the frame must be wider than the iframe.
  const border = DEVICES[device].frame ? 12 : 1;
  const frameWidth = width + border * 2;

  // Scale the device frame down to fit the canvas width when "fit" is on.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const update = () => {
      const avail = el.clientWidth - 32;
      setScale(fit && avail < frameWidth ? avail / frameWidth : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, frameWidth]);

  // Mobile clients (iOS Mail, Gmail app) zoom a fixed-width email out until it
  // fits the screen. Emulate that, then grow the iframe to the content height.
  const applyFit = useCallback(() => {
    const doc = iframe.current?.contentDocument;
    if (!doc?.body) return;
    const body = doc.body as HTMLElement & { style: CSSStyleDeclaration & { zoom?: string } };
    body.style.zoom = "";
    body.style.margin ||= "0";
    const contentWidth = doc.documentElement.scrollWidth;
    if (shrink && contentWidth > width) body.style.zoom = String(width / contentWidth);
    setHeight(Math.max(400, doc.documentElement.scrollHeight));
  }, [shrink, width]);

  useEffect(applyFit, [applyFit]);

  const visiblePins = pins.filter((p) => !p.device || p.device === device);
  const canPin = !!onPlacePin;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="min-h-11 shrink-0 border-b bg-background flex flex-wrap items-center gap-2 px-3 py-1.5">
        <Tabs value={device} onValueChange={(v) => setDevice(v as DeviceKey)}>
          <TabsList>
            {(Object.keys(DEVICES) as DeviceKey[]).map((k) => {
              const { Icon, label, width: w } = DEVICES[k];
              const count = pins.filter((p) => (!p.device || p.device === k) && !p.resolved).length;
              return (
                <TabsTrigger key={k} value={k}>
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{w}</span>
                  {count > 0 && <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono px-1.5">{count}</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-1">
          {canPin && (
            <Tooltip>
              <TooltipTrigger
                render={<Button variant={pinMode ? "default" : "outline"} size="sm" onClick={() => onPinModeChange?.(!pinMode)} aria-pressed={pinMode} />}
              >
                <MessageSquarePlusIcon data-icon="inline-start" />
                {pinMode ? "Click to place" : "Comment"}
              </TooltipTrigger>
              <TooltipContent>Click anywhere on the email to leave a pinned comment</TooltipContent>
            </Tooltip>
          )}
          <Button variant="outline" size="sm" onClick={() => setFit((f) => !f)} aria-pressed={fit}>
            {fit ? `Fit · ${Math.round(scale * 100)}%` : "100%"}
          </Button>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" onClick={() => setShrink((s) => !s)} aria-pressed={shrink} />}>
              {shrink ? "Client scaling" : "Actual size"}
            </TooltipTrigger>
            <TooltipContent>Mobile clients shrink fixed-width emails to fit the screen</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="icon-sm" disabled aria-label="Dark mode" />}>
              <MoonIcon />
            </TooltipTrigger>
            <TooltipContent>Dark mode simulation is coming in v0.2</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<a href={src} target="_blank" rel="noreferrer" aria-label="Open in new tab" />}>
            <ExternalLinkIcon />
          </Button>
        </div>
      </div>

      <div ref={canvas} className="canvas-grid flex-1 overflow-auto p-4 sm:p-6">
        <div style={{ width: frameWidth * scale, height: (height + border * 2) * scale }} className="mx-auto">
          <div
            style={{ width: frameWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
            className={[
              "bg-white shadow-[0_1px_2px_rgba(0,0,0,.06),0_12px_40px_-12px_rgba(0,0,0,.25)]",
              DEVICES[device].frame ? "rounded-[28px] border-[12px] border-zinc-900 overflow-hidden" : "rounded-md border overflow-hidden",
            ].join(" ")}
          >
            <div className="relative" style={{ width, height }}>
              {/* `sandbox` must precede `src`: Chrome aborts a load whose sandbox flags change mid-flight. */}
              <iframe
                ref={iframe}
                key={src}
                sandbox="allow-same-origin"
                title="Email preview"
                style={{ width, height }}
                className="block bg-white"
                onLoad={applyFit}
                src={src}
              />
              {/* Pin layer: catches clicks in pin mode, otherwise only the markers are interactive. */}
              <div
                className={`absolute inset-0 ${pinMode ? "cursor-crosshair" : "pointer-events-none"}`}
                onClick={(e) => {
                  if (!pinMode || !onPlacePin) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  onPlacePin({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, device });
                }}
              >
                {visiblePins.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinClick?.(p.id);
                    }}
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: `translate(-50%, -100%) scale(${1 / scale})`, transformOrigin: "bottom center" }}
                    className={[
                      "pointer-events-auto absolute grid size-7 place-items-center rounded-full rounded-bl-none border-2 border-white text-[11px] font-semibold shadow-md transition",
                      p.resolved ? "bg-zinc-500 text-white" : "bg-primary text-primary-foreground",
                      activePinId === p.id ? "ring-3 ring-primary/40 scale-110" : "",
                    ].join(" ")}
                    aria-label={`Comment ${p.n}`}
                  >
                    {p.n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
