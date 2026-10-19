import { useId, type TextareaHTMLAttributes } from "react";

export function Textarea({
  label,
  hint,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        className="min-h-24 resize-y border border-line bg-surface px-3 py-2 outline-none focus:border-ink"
        {...props}
      />
      {error ? <span className="text-sm text-red">{error}</span> : hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}
