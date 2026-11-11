"use client";

import { useState, useSyncExternalStore } from "react";
import { Alert, Button } from "@/components/ui";
import { useRole } from "@/lib/role";
import { memberRoles, permissions, type MemberRole } from "../mock-data";

type Matrix = { action: string; allowed: MemberRole[] }[];

// Rows the owner can never lose, so nobody locks the company out of its own settings.
const ownerLocked = new Set(["Edit company profile and settings", "Assign roles"]);

// Saved in this browser until the permissions API exists (story J); the API's
// own role checks don't read this yet.
const KEY = "orbit.permissions";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
let cache: { raw: string | null; value: Matrix } = { raw: null, value: permissions };
const readSaved = (): Matrix => {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) cache = { raw, value: raw ? (JSON.parse(raw) as Matrix) : permissions };
  return cache.value;
};
const save = (m: Matrix) => {
  localStorage.setItem(KEY, JSON.stringify(m));
  listeners.forEach((l) => l());
};

export function RolesMatrix() {
  const { role } = useRole();
  const canEdit = role === "owner";
  const saved = useSyncExternalStore(subscribe, readSaved, () => permissions);
  const [draft, setDraft] = useState<Matrix | null>(null);
  const [notice, setNotice] = useState<string>();
  const matrix = draft ?? saved;

  const toggle = (action: string, r: MemberRole) => {
    setNotice(undefined);
    setDraft(
      matrix.map((p) =>
        p.action !== action ? p : { ...p, allowed: p.allowed.includes(r) ? p.allowed.filter((x) => x !== r) : [...p.allowed, r] },
      ),
    );
  };

  return (
    <section aria-label="Roles and permissions">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-[22px] font-bold">Roles and permissions</h2>
        {canEdit && draft ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
            <Button
              onClick={() => {
                save(draft);
                setDraft(null);
                setNotice("Permissions saved.");
              }}
            >
              Save changes
            </Button>
          </div>
        ) : null}
      </div>
      {notice ? (
        <div className="mb-3">
          <Alert tone="success" title={notice} />
        </div>
      ) : null}
      {!canEdit ? <p className="mb-3 text-sm text-muted">Only the owner can change permissions.</p> : null}
      <table className="w-full border-t-2 border-ink text-left">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-muted">
            <th className="py-2 font-bold">Action</th>
            {memberRoles.map((r) => (
              <th key={r} className="py-2 text-center font-bold">{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((p) => (
            <tr key={p.action} className="border-t border-line">
              <td className="py-3">{p.action}</td>
              {memberRoles.map((r) => {
                const allowed = p.allowed.includes(r);
                const locked = r === "Owner" && ownerLocked.has(p.action);
                const mark = allowed ? <span className="font-bold text-blue">●</span> : <span className="text-muted">—</span>;
                return (
                  <td key={r} className="py-1 text-center">
                    {canEdit && !locked ? (
                      <button
                        role="switch"
                        aria-checked={allowed}
                        aria-label={`${r}: ${p.action}`}
                        onClick={() => toggle(p.action, r)}
                        className="size-9 hover:bg-surface focus-visible:outline-2 focus-visible:outline-ink"
                      >
                        {mark}
                      </button>
                    ) : (
                      <span className="inline-flex size-9 items-center justify-center" title={locked ? "The owner always keeps this" : undefined}>
                        {mark}
                        <span className="sr-only">{allowed ? "Allowed" : "Not allowed"}</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
