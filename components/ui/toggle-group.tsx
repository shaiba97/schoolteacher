"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToggleGroupContext = { value: string; onValueChange: (v: string) => void; disabled?: boolean };
const Ctx = React.createContext<ToggleGroupContext | null>(null);

export function ToggleGroup({
  value,
  onValueChange,
  disabled,
  children,
  className,
  ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex items-center gap-1", className)}>
      <Ctx.Provider value={{ value, onValueChange, disabled }}>{children}</Ctx.Provider>
    </div>
  );
}

export function ToggleGroupItem({
  value,
  children,
  className,
  ariaLabel,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const ctx = React.useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={ariaLabel ?? (typeof children === "string" ? children : value)}
      disabled={ctx.disabled}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
