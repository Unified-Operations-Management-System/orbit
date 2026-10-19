"use client";

import { useState } from "react";
import { colors } from "@orbit/design-tokens";
import { Button, Dialog, Input, Shape } from "@/components/ui";
import { initialMembers, memberRoles, type Member, type MemberRole, type MemberStatus } from "../mock-data";

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

export function MembersView() {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("Employee");
  const [error, setError] = useState<string>();

  const setStatus = (id: number, status: MemberStatus) =>
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, status } : m)));

  const invite = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (members.some((m) => m.email === email)) return setError("This person is already a member.");
    setMembers((ms) => [...ms, { id: Date.now(), name: email.split("@")[0] ?? email, email, role, status: "Pending" }]);
    setInviting(false);
    setEmail("");
    setError(undefined);
  };

  return (
    <section aria-label="Members">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[22px] font-bold">Members</h2>
        <Button onClick={() => setInviting(true)}>Invite member</Button>
      </div>
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
                {m.status === "Pending" ? <Button variant="secondary" onClick={() => setStatus(m.id, "Active")}>Approve</Button> : null}
                {m.status === "Active" && m.role !== "Owner" ? (
                  <Button variant="ghost" onClick={() => setStatus(m.id, "Deactivated")}>Deactivate</Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={inviting} onClose={() => setInviting(false)} title="Invite member">
        <div className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className="h-11 border border-line bg-surface px-3">
              {memberRoles.filter((r) => r !== "Owner").map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInviting(false)}>Cancel</Button>
            <Button onClick={invite}>Send invite</Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
