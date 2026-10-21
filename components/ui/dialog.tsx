"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode };

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return <>{React.Children.map(children, (child) => React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ open?: boolean; onOpenChange?: (o: boolean) => void }>, { open, onOpenChange }) : child)}</>;
}

export function DialogTrigger({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick}>{children}</div>;
}

export function DialogContent({ open, onOpenChange, children, className }: { open?: boolean; onOpenChange?: (o: boolean) => void; children: React.ReactNode; className?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} aria-hidden />
      <div role="dialog" aria-modal="true" className={cn("relative z-50 w-full max-w-lg rounded-xl border bg-card shadow-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto", className)}>
        <button onClick={() => onOpenChange?.(false)} aria-label="Close dialog" className="absolute right-3 top-3 rounded-md p-1 hover:bg-muted">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pb-2 space-y-1.5", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-2 flex justify-end gap-2", className)} {...props} />;
}
