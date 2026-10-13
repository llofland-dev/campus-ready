"use client";

import { useEffect, useRef, useState } from "react";

// Draws a PDF map inside the app, so it keeps the header, back arrow and bottom navigation. (Opening the PDF in a
// browser tab would drop all of that, and the site refuses to be framed, so a plain <iframe> is not an option.)
//
// PDF.js is not bundled by Next.js: it is two plain files in /public/pdfjs (see VERSION.txt there) loaded by their
// fixed addresses. That keeps the build and the package lockfile untouched, and lets the offline save (public/sw.js)
// store them, so a PDF map still opens with no signal.
const PDFJS_URL = "/pdfjs/pdf.min.mjs";
const PDFJS_WORKER_URL = "/pdfjs/pdf.worker.min.mjs";

const ZOOMS = [1, 1.5, 2, 3, 4];
// Phones refuse very large canvases (iOS stops around 16 million pixels), so a high zoom draws at lower density
// rather than failing to draw at all.
const MAX_CANVAS_PIXELS = 12_000_000;

// Only the small part of PDF.js this file uses.
interface PdfViewport {
  width: number;
  height: number;
}
interface PdfRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}
interface PdfPage {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: { canvas: HTMLCanvasElement; viewport: PdfViewport }) => PdfRenderTask;
  cleanup: () => void;
}
interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
}
interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
}

const buttonClass =
  "min-h-10 min-w-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100";

export function PdfViewer({ src, title }: { src: string; title: string }) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const zoom = ZOOMS[index];

  // Fetch the file ourselves (so it goes through the offline copy when there is no signal) and open it.
  useEffect(() => {
    let cancelled = false;
    let opened: PdfDocument | null = null;
    (async () => {
      try {
        const pdfjs = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PDFJS_URL)) as PdfJs;
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        const response = await fetch(src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = new Uint8Array(await response.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          void pdf.destroy();
          return;
        }
        opened = pdf;
        setDoc(pdf);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      if (opened) void opened.destroy();
    };
  }, [src]);

  // Track the width of the viewing box, so turning the phone redraws the map to fit.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => setBoxWidth(Math.round(box.clientWidth)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Draw every page at the chosen zoom. The box is measured directly (not only through the resize watcher
  // above, which reports late or not at all in a background tab), so the first draw never waits for it.
  useEffect(() => {
    const available = boxRef.current?.clientWidth || boxWidth;
    if (!doc || available <= 0) return;
    let cancelled = false;
    const tasks: PdfRenderTask[] = [];
    (async () => {
      const cssWidth = available * zoom;
      for (let n = 1; n <= doc.numPages; n++) {
        if (cancelled) return;
        const canvas = canvasesRef.current[n - 1];
        if (!canvas) continue;
        const page = await doc.getPage(n);
        if (cancelled) return;
        const natural = page.getViewport({ scale: 1 });
        const cssScale = cssWidth / natural.width;
        const cssHeight = natural.height * cssScale;
        const density = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight)));
        canvas.width = Math.floor(cssWidth * density);
        canvas.height = Math.floor(cssHeight * density);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        const task = page.render({ canvas, viewport: page.getViewport({ scale: cssScale * density }) });
        tasks.push(task);
        try {
          await task.promise;
        } catch {
          // Cancelled because the zoom changed again — the newer pass draws it.
        }
        page.cleanup();
      }
    })();
    return () => {
      cancelled = true;
      tasks.forEach((task) => task.cancel());
    };
  }, [doc, zoom, boxWidth]);

  const ready = status === "ready";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Zoom out" disabled={!ready || index === 0} onClick={() => setIndex((i) => i - 1)} className={buttonClass}>
          −
        </button>
        <button type="button" aria-label="Fit to screen" disabled={!ready || index === 0} onClick={() => setIndex(0)} className={buttonClass}>
          Fit
        </button>
        <button type="button" aria-label="Zoom in" disabled={!ready || index === ZOOMS.length - 1} onClick={() => setIndex((i) => i + 1)} className={buttonClass}>
          +
        </button>
        <span className="ml-1 text-xs text-zinc-500">{Math.round(zoom * 100)}%</span>
        <a href={src} target="_blank" rel="noopener" className="ml-auto text-sm underline">
          Open PDF in a new tab
        </a>
      </div>

      {status === "loading" && <p className="text-sm text-zinc-500">Loading map…</p>}
      {status === "error" && (
        <p className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          This map couldn&apos;t be shown here. Tap &quot;Open PDF in a new tab&quot; above to view it.
        </p>
      )}

      <div
        ref={boxRef}
        className={`max-h-[70vh] overflow-auto rounded-xl border border-black/10 bg-white dark:border-white/10 ${ready ? "" : "hidden"}`}
      >
        {Array.from({ length: doc?.numPages ?? 0 }, (_, i) => (
          <canvas
            key={i}
            role="img"
            aria-label={`${title}, page ${i + 1}`}
            ref={(el) => {
              canvasesRef.current[i] = el;
            }}
            className="block border-b border-black/10 last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}
