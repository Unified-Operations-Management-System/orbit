import { useId, type SelectHTMLAttributes } from "react";

export function Select({
  label,
  hint,
  error,
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className="h-11 border border-line bg-surface px-3 outline-none focus:border-ink"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-sm text-red">{error}</span> : hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}
