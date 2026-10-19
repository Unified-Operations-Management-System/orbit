import { useId, type InputHTMLAttributes } from "react";

export function Input({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className="h-11 border border-line bg-surface px-3 outline-none focus:border-ink"
        {...props}
      />
      {error ? <span className="text-sm text-red">{error}</span> : hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}
