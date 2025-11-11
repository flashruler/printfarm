import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0..100
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, value ?? 0));
    return (
      <div
        ref={ref}
        className={cn(
          // Visible track
          "relative w-full h-2 rounded-full bg-muted border border-border/50 overflow-hidden",
          className
        )}
        {...props}
      >
        <div
          // Filled portion
          className="h-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export default Progress;
