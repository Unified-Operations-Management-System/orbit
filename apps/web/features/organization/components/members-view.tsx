"use client";

import { useEffect, useState } from "react";
import { colors } from "@orbit/design-tokens";
import type { Problem } from "@orbit/api-client";
import { Alert, Button, Dialog, Input, Panel, Select, Shape, stickyHeadCell } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { memberRoles, type Member, type MemberRole, type MemberStatus } from "../mock-data";
import { ChangeRoleDialog } from "./change-role-dialog";
import { DeactivateDialog } from "./deactivate-dialog";

const statusStyle: Record<MemberStatus, string> = {
  Active: "text-blue",
  Pending: "text-ink",
  Deactivated: "text-muted line-through",
};
const statusShape: Record<MemberStatus, { shape: "circle" | "triangle" | "square"; color: string }> = {
  Active: { shape: "circle", color: colors.blue },
  Pending: { shape: "triangle", color: colors.yellow },
  Deactivated: { shape: "square", color: colors.muted },
};

// First field error, else the problem's detail.
const problemMessage = (p: Problem | undefined) => p?.errors?.[0]?.message ?? p?.detail ?? "Something went wrong.";

export function MembersView() {
  const { role: signedInAs } = useRole();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("Employee");
  const [error, setError] = useState<string>();
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Member | null>(null);
  const [notice, setNotice] = useState<string>();

  const headers = signedInAs ? authHeaders(signedInAs) : undefined;

  // The API decides who sees whom (BR-OAM-R09).
  useEffect(() => {
    if (!signedInAs) return;
    let live = true;
    void browserApi.GET("/members", { headers: authHeaders(signedInAs) }).then(({ data, error }) => {
      if (!live) return;
      if (error) return setLoadError(problemMessage(error));
      setLoadError(undefined);
      setMembers(data);
    });
    return () => {
      live = false;
    };
  }, [signedInAs]);

  const replace = (updated: Member) => setMembers((ms) => ms.map((m) => (m.id === updated.id ? updated : m)));

  const changeRole = async (member: Member, role: MemberRole) => {
    setRoleTarget(null);
    const { data, error } = await browserApi.PATCH("/members/{memberId}/role", { headers, params: { path: { memberId: member.id } }, body: { role } });
    if (error) return setNotice(`Couldn't change ${member.name}'s role: ${problemMessage(error)}`);
    replace(data);
    setNotice(`${member.name} is now ${data.role}.`);
  };

  const approve = async (member: Member) => {
    const { data, error } = await browserApi.POST("/members/{memberId}/approve", { headers, params: { path: { memberId: member.id } } });
    if (error) return setNotice(`Couldn't approve ${member.name}: ${problemMessage(error)}`);
    replace(data);
    setNotice(`${member.name} is now active.`);
  };

  const deactivate = async (member: Member) => {
    setDeactivateTarget(null);
    const { data, error } = await browserApi.POST("/members/{memberId}/deactivate", { headers, params: { path: { memberId: member.id } } });
    if (error) return setNotice(`Couldn't deactivate ${member.name}: ${problemMessage(error)}`);
    replace(data);
    setNotice(`${member.name} was deactivated.`);
  };

  const invite = async () => {
    const { data, error } = await browserApi.POST("/members", { headers, body: { name, email, role } });
    if (error) return setError(problemMessage(error));
    setMembers((ms) => [...ms, data]);
    setInviting(false);
    setName("");
    setEmail("");
    setError(undefined);
    setNotice(`Invitation sent to ${data.email}.`);
  };

  return (
    <Panel title="Members" className="flex-1" actions={<Button onClick={() => setInviting(true)}>Invite member</Button>}>
      {loadError ? (
        <div className="mb-3">
          <Alert tone="error" title={loadError} />
        </div>
      ) : null}
      {notice ? (
        <div className="mb-3">
          <Alert tone="success" title={notice} />
        </div>
      ) : null}
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-muted">
            <th className={`py-2 font-bold ${stickyHeadCell}`}>Name</th>
            <th className={`py-2 font-bold ${stickyHeadCell}`}>Role</th>
            <th className={`py-2 font-bold ${stickyHeadCell}`}>Status</th>
            <th className={`py-2 ${stickyHeadCell}`} />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-t border-line">
              <td className="py-3">
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-muted">{m.email}</div>
              </td>
              <td className="py-3">{m.role}</td>
              <td className={`py-3 font-bold ${statusStyle[m.status]}`}>
                <span className="inline-flex items-center gap-1.5">
                  <Shape {...statusShape[m.status]} size={10} />
                  {m.status}
                </span>
              </td>
              <td className="py-3 text-right">
                {m.status === "Pending" ? <Button variant="secondary" onClick={() => void approve(m)}>Approve</Button> : null}
                {m.status === "Active" && m.role !== "Owner" ? (
                  <>
                    <Button variant="ghost" onClick={() => setRoleTarget(m)}>Change role</Button>
                    <Button variant="ghost" onClick={() => setDeactivateTarget(m)}>Deactivate</Button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={inviting} onClose={() => setInviting(false)} title="Invite member">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Select label="Role" value={role} onChange={(v) => setRole(v as MemberRole)} options={memberRoles.filter((r) => r !== "Owner").map((r) => ({ value: r, label: r }))} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInviting(false)}>Cancel</Button>
            <Button onClick={() => void invite()}>Send invite</Button>
          </div>
        </div>
      </Dialog>

      {roleTarget ? (
        <ChangeRoleDialog
          key={roleTarget.id}
          member={roleTarget}
          open
          onClose={() => setRoleTarget(null)}
          onSave={(r) => void changeRole(roleTarget, r)}
        />
      ) : null}
      {deactivateTarget ? (
        <DeactivateDialog
          key={deactivateTarget.id}
          member={deactivateTarget}
          open
          onClose={() => setDeactivateTarget(null)}
          onConfirm={() => void deactivate(deactivateTarget)}
        />
      ) : null}
    </Panel>
  );
}
