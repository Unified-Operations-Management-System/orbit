"use client";

import { useEffect, useState } from "react";
import { colors } from "@orbit/design-tokens";
import type { Problem } from "@orbit/api-client";
import { Alert, Button, Dialog, Input, Select, Shape } from "@/components/ui";
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

  // No role-change endpoint yet: the change is shown but not saved.
  const changeRole = (member: Member, role: MemberRole) => {
    replace({ ...member, role });
    setRoleTarget(null);
    setNotice(`${member.name} is now ${role} (not saved yet).`);
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
    <section aria-label="Members">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[22px] font-bold">Members</h2>
        <Button onClick={() => setInviting(true)}>Invite member</Button>
      </div>
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
      <table className="w-full border-t-2 border-ink text-left">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-muted">
            <th className="py-2 font-bold">Name</th>
            <th className="py-2 font-bold">Role</th>
            <th className="py-2 font-bold">Status</th>
            <th className="py-2" />
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
          onSave={(r) => changeRole(roleTarget, r)}
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
    </section>
  );
}
