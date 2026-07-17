import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "press inline-flex items-center justify-center gap-1.5 rounded-[6px] font-medium " +
  "transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] " +
  "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-navy text-white hover:bg-navy-2 active:bg-navy-3",
  secondary:
    "bg-canvas text-ink border border-line hover:border-line-strong hover:bg-raise",
  ghost:
    "bg-transparent text-ink hover:bg-raise",
  danger:
    "bg-canvas text-danger border border-line hover:bg-danger-wash hover:border-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3 text-[13px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
