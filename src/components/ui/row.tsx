import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Row — unidade de linha de 40px. Hover --raise, borda inferior --line.
 * Base para toda lista do app.
 */
export const Row = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Row({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "group flex h-10 items-center gap-3 border-b border-line px-3 transition-colors",
          "duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]",
          "hover:bg-raise",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
