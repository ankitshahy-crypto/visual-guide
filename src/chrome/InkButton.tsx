import type { ButtonHTMLAttributes } from "react";

export default function InkButton({ className = "", type, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type ?? "button"}
      className={`w-full border border-ink bg-paper px-4 py-3.5 text-center text-lg font-bold text-ink disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${className}`}
      {...rest}
    />
  );
}
