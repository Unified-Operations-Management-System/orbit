"use client";

import type { ChangeEvent } from "react";

export function SearchInput({
  label = "Search",
  value,
  onChange,
  placeholder,
  className = "",
  id,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        aria-hidden
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      >
        <circle cx={7} cy={7} r={5} />
        <path d={`M11 11 15 15`} />
      </svg>
      <input
        id={id}
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="h-11 w-full border border-line bg-surface pl-9 pr-9 text-ink outline-none focus:border-ink [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-lg text-muted hover:text-ink"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
