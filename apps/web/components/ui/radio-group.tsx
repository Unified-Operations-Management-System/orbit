import { useId } from "react";

type Option = { value: string; label: string; description?: string };

// Native radios kept for keyboard and form behaviour; the visible control is a drawn circle.
export function RadioGroup({
  label,
  options,
  value,
  onChange,
  name,
  disabled,
  hint,
  inline = false,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
  hint?: string;
  inline?: boolean;
}) {
  const uid = useId();
  const group = name ?? uid;
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-50">
      <legend className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</legend>
      <div className={inline ? "flex flex-wrap gap-6" : "flex flex-col gap-2"}>
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-2 has-[input:disabled]:cursor-not-allowed">
            <input
              type="radio"
              name={group}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper peer-checked:[&>span]:visible peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
            >
              <span className="invisible size-2.5 rounded-full bg-ink" />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-medium">{o.label}</span>
              {o.description ? <span className="text-sm text-muted">{o.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </fieldset>
  );
}
