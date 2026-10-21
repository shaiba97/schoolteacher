"use client";

import * as React from "react";
import { Toast } from "@base-ui/react/toast";
import { CheckCircle2, X } from "lucide-react";

function ToastViewport() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Viewport className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-4">
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className="flex items-start gap-2.5 rounded-xl border bg-card p-4 shadow-lg"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
          <div className="min-w-0 flex-1">
            <Toast.Title className="text-sm font-medium" />
            <Toast.Description className="mt-0.5 text-xs text-muted-foreground" />
          </div>
          <Toast.Close
            aria-label="Dismiss notification"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden />
          </Toast.Close>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}

/**
 * Mount once at the root layout: provides the toast manager to the whole
 * app and renders the viewport. Pages fire toasts via `useToastManager()`.
 */
export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <ToastViewport />
    </Toast.Provider>
  );
}
