import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border bg-card",
  success: "bg-success/10 text-success border-success/20 border",
  warning: "bg-warning/10 text-warning border-warning/20 border",
  info: "bg-info/10 text-info border-info/20 border",
  destructive: "bg-destructive/10 text-destructive border-destructive/20 border",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof badgeVariants }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none whitespace-nowrap",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
