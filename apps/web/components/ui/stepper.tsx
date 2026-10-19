export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-start gap-y-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex items-center"
          >
            <span className="flex flex-col items-center gap-1">
              <span
                className={`size-3 border-2 ${done ? "border-ink bg-ink" : active ? "border-red bg-red" : "border-line bg-surface"}`}
                aria-hidden
              />
              <span
                className={`text-xs ${done ? "text-ink" : active ? "font-bold text-ink" : "text-muted"}`}
              >
                {label}
              </span>
            </span>
            {i < steps.length - 1 ? (
              <span aria-hidden className={`mx-2 mb-[22px] h-[2px] w-8 ${done ? "bg-ink" : "bg-line"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
