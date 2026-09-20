import type { ButtonHTMLAttributes } from "react";

type Variant = "solid" | "outline";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function OrangeButton({ variant = "solid", className = "", type, ...rest }: Props) {
  const look = variant === "solid"
    ? "border-action bg-action text-paper"
    : "border-action bg-chrome text-action";
  return (
    <button
      type={type ?? "button"}
      className={`w-full border px-4 py-3.5 text-center text-lg font-bold disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${look} ${className}`}
      {...rest}
    />
  );
}
