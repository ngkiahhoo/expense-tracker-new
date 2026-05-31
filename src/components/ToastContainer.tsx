"use client";

import { useToast, type ToastType } from "@/contexts/ToastContext";
import { X } from "lucide-react";

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
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2 pointer-events-none">
      {toasts.map((toast: { id: string; message: string; type: ToastType }) => (
        <div
          key={toast.id}
          className={`
            ${getToastStyles(toast.type)}
            text-white
            rounded-lg
            p-4
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
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
