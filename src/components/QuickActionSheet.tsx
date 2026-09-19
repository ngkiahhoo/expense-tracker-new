"use client";
import { createContext, useContext, useEffect, useRef, useState, type FocusEventHandler, type ReactNode } from "react";
import { createPortal } from "react-dom";
import OverlayPortal from "@/components/ui/OverlayPortal";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { cn, overlayStyles } from "@/components/ui/styles";
import { confirmPanelClose } from "@/hooks/useUnsavedChanges";

const FooterContext = createContext<HTMLElement | null>(null);
export function SheetFooter({ children }: { children: ReactNode }) {
  const target = useContext(FooterContext);
  return target ? createPortal(<div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">{children}</div>, target) : <div className="sticky bottom-0 flex flex-wrap gap-2 bg-zinc-950 p-3">{children}</div>;
}

export default function QuickActionSheet({ children, onClose, onFocusCapture, title, widthClass }: {
  children: ReactNode; onClose: () => void; onFocusCapture?: FocusEventHandler<HTMLDivElement>; title: string; widthClass: string;
}) {
  const [footer, setFooter] = useState<HTMLElement | null>(null);
  const [viewport, setViewport] = useState<{ height: number; bottom: number } | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const restoring = useRef(false);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const update = () => {
      const view = window.visualViewport;
      const height = view?.height ?? innerHeight;
      const keyboard = Math.max(0, innerHeight - height - (view?.offsetTop ?? 0));
      setViewport({ height: Math.max(160, height - (keyboard > 80 ? 24 : 112)), bottom: keyboard > 80 ? keyboard + 8 : 96 });
    };
    const timer = setTimeout(update, 0);
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && confirmPanelClose()) close.current(); };
    document.addEventListener("keydown", key);
    return () => { clearTimeout(timer); window.visualViewport?.removeEventListener("resize", update); window.removeEventListener("resize", update); document.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => {
    const element = scroll.current;
    if (!element) return;
    let target = 0;
    try { target = Number(sessionStorage.getItem(`sheet-scroll:${title}`) || 0); } catch { /* Optional scroll memory. */ }
    restoring.current = true;
    element.scrollTop = 0;
    const stop = () => { restoring.current = false; observer.disconnect(); };
    const restore = () => {
      if (restoring.current && element.scrollHeight - element.clientHeight >= target) { element.scrollTop = target; stop(); }
    };
    const observer = new MutationObserver(restore);
    observer.observe(element, { subtree: true, childList: true });
    const timer = setTimeout(restore, 0), timeout = setTimeout(stop, 5000);
    element.addEventListener("wheel", stop, { passive: true }); element.addEventListener("touchstart", stop, { passive: true });
    return () => { clearTimeout(timer); clearTimeout(timeout); observer.disconnect(); element.removeEventListener("wheel", stop); element.removeEventListener("touchstart", stop); };
  }, [title]);
  return <OverlayPortal><div role="dialog" aria-label={title} className={`fixed inset-x-0 bottom-24 z-[55] px-3 lg:left-auto lg:right-8 lg:px-0 lg:max-w-[calc(100vw-2rem)] ${widthClass}`} style={viewport ? { bottom: viewport.bottom } : undefined} onFocusCapture={onFocusCapture}>
    <div className={cn("mx-auto flex max-h-[75dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg", overlayStyles.sheetPanel)} style={viewport ? { maxHeight: viewport.height } : undefined}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-4"><h2 className="min-w-0 break-words text-lg font-semibold">{title}</h2><ActionIconButton kind="close" onClick={() => { if (confirmPanelClose()) onClose(); }} title="Close panel" aria-label="Close panel" /></header>
      <FooterContext.Provider value={footer}><div ref={scroll} data-sheet-scroll className="min-h-0 overflow-y-auto overscroll-contain p-4" onScroll={e => { if (!restoring.current) try { sessionStorage.setItem(`sheet-scroll:${title}`, String(e.currentTarget.scrollTop)); } catch { /* Optional scroll memory. */ } }}>{children}</div></FooterContext.Provider>
      <div ref={setFooter} className="shrink-0" />
    </div>
  </div></OverlayPortal>;
}
