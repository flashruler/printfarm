import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
    const variants: Record<Variant, string> = {
      default: "bg-primary text-primary-foreground border-transparent",
      outline: "text-foreground border-border",
    };
    return (
      <span ref={ref} className={cn(base, variants[variant], className)} {...props} />
    );
  }
);
Badge.displayName = "Badge";

export default Badge;
