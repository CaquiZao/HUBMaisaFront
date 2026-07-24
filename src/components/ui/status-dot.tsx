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
          "inline-block h-2.5 w-2.5 rounded-full bg-red-500",
          className,
        )}
      />
    );
  }
  if (coluna === "fazendo") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full bg-amber-400",
          className,
        )}
      />
    );
  }
  if (coluna === "feito") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full bg-blue-500",
          className,
        )}
      />
    );
  }
  // validado — verde brilhante
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]",
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
          stroke="#064E3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
