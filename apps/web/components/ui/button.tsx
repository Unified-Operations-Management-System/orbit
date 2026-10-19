import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-red text-paper hover:brightness-95",
  secondary: "bg-ink text-paper hover:bg-ink/90",
  ghost: "text-ink hover:bg-surface",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 px-5 text-[15px] font-bold disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
