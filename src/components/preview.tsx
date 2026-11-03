"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEVICES = {
  desktop: { label: "Masaüstü", width: 1000, frame: false },
  tablet: { label: "Tablet", width: 768, frame: true },
  mobile: { label: "Mobil", width: 390, frame: true },
} as const;
type DeviceKey = keyof typeof DEVICES;

export function Preview({ src }: { src: string }) {
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [fit, setFit] = useState(true);
  const [height, setHeight] = useState(800);
  const canvas = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
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
      const avail = el.clientWidth - 48;
      setScale(fit && avail < frameWidth ? avail / frameWidth : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, frameWidth]);

  // Mobile clients (iOS Mail, Gmail app) zoom a fixed-width email out until it
  // fits the screen. Emulate that, then grow the iframe to the content height.
  const [shrink, setShrink] = useState(true);
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

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-11 shrink-0 border-b border-border bg-bg-elevated flex items-center gap-1 px-3">
        <div role="tablist" className="flex gap-1 rounded-lg bg-bg-sunken p-0.5">
          {(Object.keys(DEVICES) as DeviceKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={device === k}
              onClick={() => setDevice(k)}
              className="px-3 py-1 rounded-md aria-selected:bg-bg-elevated aria-selected:shadow-sm text-fg-muted aria-selected:text-fg transition"
            >
              {DEVICES[k].label}
              <span className="ml-1.5 font-mono text-[11px] text-fg-subtle">{DEVICES[k].width}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setFit((f) => !f)} className="btn" aria-pressed={fit}>
            {fit ? `Sığdır · ${Math.round(scale * 100)}%` : "100%"}
          </button>
          <button
            onClick={() => setShrink((s) => !s)}
            className="btn"
            aria-pressed={shrink}
            title="Mobil istemciler sabit genişlikli e-postayı ekrana sığdırmak için küçültür"
          >
            {shrink ? "İstemci ölçekler" : "Gerçek boyut"}
          </button>
          <button className="btn" disabled title="Dark mode simülasyonu v0.2'de">
            Koyu
          </button>
          <a href={src} target="_blank" rel="noreferrer" className="btn">
            Yeni sekme
          </a>
        </div>
      </div>

      <div ref={canvas} className="canvas-grid flex-1 overflow-auto p-6">
        <div style={{ width: frameWidth * scale, height: (height + border * 2) * scale }} className="mx-auto">
          <div
            style={{ width: frameWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
            className={[
              "bg-white shadow-[0_1px_2px_rgba(0,0,0,.06),0_12px_40px_-12px_rgba(0,0,0,.25)]",
              DEVICES[device].frame ? "rounded-[28px] border-[12px] border-zinc-900 overflow-hidden" : "rounded-md border border-border overflow-hidden",
            ].join(" ")}
          >
            {/* `sandbox` must precede `src`: Chrome aborts a load whose sandbox flags change mid-flight. */}
            <iframe
              ref={iframe}
              key={src}
              sandbox="allow-same-origin"
              title="E-posta önizleme"
              style={{ width, height }}
              className="block bg-white"
              onLoad={applyFit}
              src={src}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
