"use client";

import { useEffect, useState } from "react";
import type { PermissionMatrix, Problem } from "@orbit/api-client";
import { Alert, Button, Panel, stickyHeadCell } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { memberRoles, permissionLabels, type MemberRole } from "../mock-data";

type Row = PermissionMatrix["rows"][number];

const problemMessage = (p: Problem | undefined) => p?.errors?.[0]?.message ?? p?.detail ?? "Something went wrong.";

// The matrix lives in the API, which also enforces it: editing a row changes who
// may do that action. Only the owner edits; the owner-locked rows keep the owner.
export function RolesMatrix() {
  const { role } = useRole();
  const canEdit = role === "owner";
  const [saved, setSaved] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();
  const rows = draft ?? saved;

  useEffect(() => {
    if (!role) return;
    let live = true;
    void browserApi.GET("/permissions", { headers: authHeaders(role) }).then(({ data, error }) => {
      if (!live) return;
      if (error) return setNotice({ tone: "error", text: problemMessage(error) });
      setSaved(data.rows);
    });
    return () => {
      live = false;
    };
  }, [role]);

  const toggle = (action: Row["action"], r: MemberRole) => {
    setNotice(undefined);
    setDraft(rows.map((p) => (p.action !== action ? p : { ...p, allowed: p.allowed.includes(r) ? p.allowed.filter((x) => x !== r) : [...p.allowed, r] })));
  };

  const save = async () => {
    if (!draft || !role) return;
    const body = { rows: draft.map(({ action, allowed }) => ({ action, allowed })) };
    const { data, error } = await browserApi.PUT("/permissions", { headers: authHeaders(role), body });
    if (error) return setNotice({ tone: "error", text: `Couldn't save: ${problemMessage(error)}` });
    setSaved(data.rows);
    setDraft(null);
    setNotice({ tone: "success", text: "Permissions saved." });
  };

  return (
    <Panel
      title="Roles and permissions"
      className="flex-1"
      actions={
        canEdit && draft ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
            <Button onClick={() => void save()}>Save changes</Button>
          </div>
        ) : null
      }
    >
      {notice ? (
        <div className="mb-3">
          <Alert tone={notice.tone} title={notice.text} />
        </div>
      ) : null}
      {!canEdit ? <p className="mb-3 text-sm text-muted">Only the owner can change permissions.</p> : null}
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-muted">
            <th className={`py-2 font-bold ${stickyHeadCell}`}>Action</th>
            {memberRoles.map((r) => (
              <th key={r} className={`py-2 text-center font-bold ${stickyHeadCell}`}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const label = permissionLabels[p.action];
            return (
              <tr key={p.action} className="border-t border-line">
                <td className="py-3">{label}</td>
                {memberRoles.map((r) => {
                  const allowed = p.allowed.includes(r);
                  const locked = r === "Owner" && p.ownerLocked;
                  const mark = allowed ? <span className="font-bold text-blue">●</span> : <span className="text-muted">—</span>;
                  return (
                    <td key={r} className="py-1 text-center">
                      {canEdit && !locked ? (
                        <button
                          role="switch"
                          aria-checked={allowed}
                          aria-label={`${r}: ${label}`}
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
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
