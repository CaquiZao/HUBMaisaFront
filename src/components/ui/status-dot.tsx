import type { Coluna } from "@/types";
import { cn } from "@/lib/utils";

/**
 * StatusDot — 8px, só navy + ouro. Sempre acompanhado de label textual (§13).
 */
export function StatusDot({
  coluna,
  className,
}: {
  coluna: Coluna;
  className?: string;
}) {
  if (coluna === "planejado") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-2 w-2 rounded-full border border-line-strong bg-transparent",
          className,
        )}
      />
    );
  }
  if (coluna === "fazendo") {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block h-2 w-2 rounded-full bg-gold", className)}
      />
    );
  }
  if (coluna === "feito") {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block h-2 w-2 rounded-full bg-navy", className)}
      />
    );
  }
  // validado — navy com check ouro 6px
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-2 w-2 items-center justify-center rounded-full bg-navy",
        className,
      )}
    >
      <svg
        viewBox="0 0 6 6"
        width="6"
        height="6"
        className="absolute"
        aria-hidden="true"
      >
        <path
          d="M1 3.2 L2.4 4.5 L5 1.5"
          fill="none"
          stroke="#EAB409"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
