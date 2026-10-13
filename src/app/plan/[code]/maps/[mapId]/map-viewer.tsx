"use client";

import { useState } from "react";

const ZOOMS = [1, 1.5, 2, 3, 4];
const buttonClass =
  "min-h-10 min-w-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100";

// A map is only useful if you can zoom in on a room number, so the image sits in a box that scrolls in
// both directions and the buttons step the zoom. (Pinching the page itself also works on a phone.)
export function MapViewer({ src, alt }: { src: string; alt: string }) {
  const [index, setIndex] = useState(0);
  const zoom = ZOOMS[index];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Zoom out" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className={buttonClass}>
          −
        </button>
        <button type="button" aria-label="Fit to screen" disabled={index === 0} onClick={() => setIndex(0)} className={buttonClass}>
          Fit
        </button>
        <button type="button" aria-label="Zoom in" disabled={index === ZOOMS.length - 1} onClick={() => setIndex((i) => i + 1)} className={buttonClass}>
          +
        </button>
        <span className="ml-1 text-xs text-zinc-500">{Math.round(zoom * 100)}%</span>
        <a href={src} target="_blank" rel="noopener" className="ml-auto text-sm underline">
          Open full size
        </a>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-black/10 bg-white dark:border-white/10">
        {/* The map's own address, only known at runtime and served by our gated route, so a plain <img>. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
          className="block h-auto"
        />
      </div>
    </div>
  );
}
