import { useId, type InputHTMLAttributes } from "react";

export function Checkbox({
  label,
  description,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = useId();
  const descId = useId();
  return (
    <label
      htmlFor={id}
      className="has-[input:disabled]:cursor-not-allowed flex items-start gap-2"
    >
      <input
        id={id}
        type="checkbox"
        aria-describedby={description ? descId : undefined}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden
        className="peer-checked:[&>span]:visible peer-checked:bg-ink peer-disabled:opacity-50 peer-focus-visible:outline peer-focus-visible:outline-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:cursor-not-allowed flex size-[22px] shrink-0 items-center justify-center border-2 border-ink bg-paper"
      >
        <span className="invisible text-sm font-bold text-paper">✓</span>
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-medium">{label}</span>
        {description ? (
          <span id={descId} className="text-sm text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
