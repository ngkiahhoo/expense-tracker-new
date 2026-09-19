"use client";
import { useEffect } from "react";

export function confirmPanelClose() {
  return window.dispatchEvent(new Event("workspace:before-close", { cancelable: true }));
}

export default function useUnsavedChanges(dirty: boolean, busy = false) {
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const check = (event: Event) => {
      if (event.defaultPrevented) return;
      if (busy || !window.confirm("Unsaved changes. Leave this editor?")) event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== location.origin || link.href === location.href || event.ctrlKey || event.metaKey) return;
      check(event);
      if (event.defaultPrevented) event.stopPropagation();
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("workspace:before-close", check);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); window.removeEventListener("workspace:before-close", check); document.removeEventListener("click", click, true); };
  }, [dirty, busy]);
}
