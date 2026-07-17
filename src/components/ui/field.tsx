import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "block w-full rounded-[6px] border border-line bg-canvas text-[13px] text-ink " +
  "placeholder:text-ink-faint px-2.5 py-2 " +
  "hover:border-line-strong " +
  "transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseField, "h-9", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(baseField, "min-h-[80px] resize-y", className)}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[12px] font-medium text-ink"
    >
      {children}
    </label>
  );
}
