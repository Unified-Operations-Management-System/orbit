"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-full max-w-md border-t-[6px] border-red bg-paper p-6 backdrop:bg-ink/40">
      <h2 className="mb-4 text-[22px] font-bold">{title}</h2>
      {children}
    </dialog>
  );
}
