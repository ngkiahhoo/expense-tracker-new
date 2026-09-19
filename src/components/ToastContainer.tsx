"use client";

import { useToast, type ToastType } from "@/contexts/ToastContext";
import ActionIconButton from "@/components/ui/ActionIconButton";

function getToastStyles(type: ToastType) {
  switch (type) {
    case "success":
      return "bg-green-600 border border-green-500";
    case "error":
      return "bg-red-600 border border-red-500";
    case "warning":
      return "bg-yellow-600 border border-yellow-500";
    case "info":
    default:
      return "bg-blue-600 border border-blue-500";
  }
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div aria-live="polite" className="fixed left-3 right-3 top-4 z-[80] ml-auto max-w-sm space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
          className={`
            ${getToastStyles(toast.type)}
            text-white
            rounded-lg
            p-3
            shadow-lg
            flex
            items-center
            justify-between
            gap-3
            pointer-events-auto
            animate-in
            fade-in
            slide-in-from-top-2
            duration-200
          `}
        >
          <p className="text-sm font-medium">{toast.message}</p>
          {toast.action && <button className="shrink-0 text-sm font-semibold underline" onClick={() => { removeToast(toast.id); toast.action?.onClick(); }}>{toast.action.label}</button>}
          <ActionIconButton
            className="!h-8 !w-8 shrink-0"
            kind="close"
            onClick={() => removeToast(toast.id)}
            title="Close notification"
            aria-label="Close notification"
          />
        </div>
      ))}
    </div>
  );
}
