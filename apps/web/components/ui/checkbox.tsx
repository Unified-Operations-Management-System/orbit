import { useId, type InputHTMLAttributes } from "react";

export function Checkbox({
  label,
  description,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = useId();
  const descId = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        aria-describedby={description ? descId : undefined}
        className="mt-0.5 size-5 shrink-0 accent-ink"
        {...props}
      />
      <span>
        <span className="text-[15px] font-bold">{label}</span>
        {description ? (
          <span id={descId} className="block text-sm text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
