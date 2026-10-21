"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContext = { value: string; onValueChange: (v: string) => void };
const Ctx = React.createContext<TabsContext | null>(null);

export function Tabs({ value, onValueChange, children, className }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return <Ctx.Provider value={{ value, onValueChange }}><div className={cn("", className)}>{children}</div></Ctx.Provider>;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // justify-start (not center): centered content clips on the left when it
  // overflows, making the first tabs unreachable by scroll.
  return <div role="tablist" className={cn("inline-flex h-9 max-w-full items-center justify-start gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />;
}
export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button role="tab" aria-selected={active} data-state={active ? "active" : "inactive"} onClick={() => ctx.onValueChange(value)} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className)}>
      {children}
    </button>
  );
}
export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div role="tabpanel" className={cn("mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>{children}</div>;
}
