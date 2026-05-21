"use client";

import { useEffect, useRef, useState } from "react";
import ExportRangeSelector from "./ExportRangeSelector";
import ExportOptions from "./ExportOptions";
import useAIExport from "../../../hooks/useAIExport";
import type { ExportRange } from "../../../types/export";

export default function AIExportSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [range, setRange] = useState<ExportRange>("30d");
  const [options, setOptions] = useState({
    includeExpenses: true,
    includeMonthlySummary: true,
    includeCategories: true,
    includeAIPrompt: true,
  });

  const { loading, copied, error, payload, generateExport, copyToClipboard } = useAIExport();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dialogStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const clientX = e.clientX;
      const clientY = e.clientY;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      setPos({ x: dialogStart.current.x + dx, y: dialogStart.current.y + dy });
    }

    function onUp() {
      dragging.current = false;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 sm:px-6" onClick={onClose}>
      <div
        ref={dialogRef}
        style={pos ? { position: "fixed", left: pos.x, top: pos.y } : undefined}
        className="w-full max-w-3xl overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={headerRef}
          onMouseDown={(e) => {
            // initialize dragging: capture current dialog position
            const el = dialogRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            dragging.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY };
            dialogStart.current = { x: rect.left, y: rect.top };
            // ensure absolute positioning
            setPos({ x: rect.left, y: rect.top });
            e.preventDefault();
          }}
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 p-4 cursor-grab"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Export</p>
            <h2 className="text-xl font-bold text-white">Export for AI Analysis</h2>
            <p className="text-sm text-zinc-400">Generate AI-ready financial data for ChatGPT, Claude, and Gemini.</p>
          </div>

          <button onClick={onClose} title="Close" aria-label="Close" className="rounded-2xl bg-zinc-900 p-3 text-zinc-300 transition hover:bg-zinc-800">Close</button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-sm text-zinc-400 mb-2">Range</h3>
            <ExportRangeSelector value={range} onChange={setRange} />
          </div>

          <div>
            <h3 className="text-sm text-zinc-400 mb-2">Options</h3>
            <ExportOptions options={options} onChange={setOptions} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (!payload) {
                  await generateExport(range, options);
                } else {
                  await copyToClipboard(payload);
                }
              }}
              disabled={loading}
              className="rounded-2xl bg-white text-black px-4 py-3 font-bold"
            >
              {loading ? "Generating..." : payload ? (copied ? "Copied" : "Copy export to clipboard") : "Generate export"}
            </button>

            {copied && (
              <div className="text-sm text-emerald-400">Copied successfully. Paste into ChatGPT or Claude for AI analysis.</div>
            )}

            {error && <div className="text-sm text-red-500">{error}</div>}
          </div>

          {payload && (
            <div>
              <h4 className="text-sm text-zinc-400 mb-2">Export preview (you can manually copy)</h4>
              <textarea readOnly value={payload} className="w-full h-40 rounded-md bg-zinc-900 p-3 text-sm text-zinc-100" />
            </div>
          )}

          <div className="text-xs text-zinc-500">Note: The export is copied to your clipboard; you can paste it into any AI tool.</div>
        </div>
      </div>
    </div>
  );
}
