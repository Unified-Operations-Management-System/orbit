"use client";

import { useState } from "react";
import { Alert, Button, Dialog, Select } from "@/components/ui";
import { memberRoles, type Member, type MemberRole } from "../mock-data";

export function ChangeRoleDialog({
  member,
  open,
  onClose,
  onSave,
}: {
  member: Member;
  open: boolean;
  onClose: () => void;
  onSave: (role: MemberRole) => void;
}) {
  const [role, setRole] = useState<MemberRole>(member.role);


  return (
    <Dialog open={open} onClose={onClose} title="Change role">
      <div className="flex flex-col gap-4">
        <div>
          <div className="font-medium">{member.name}</div>
          <div className="text-sm text-muted">{member.email}</div>
        </div>
        <Select
          label="New role"
          value={role}
          onChange={(v) => setRole(v as MemberRole)}
          options={memberRoles.filter((r) => r !== "Owner").map((r) => ({ value: r, label: r }))}
        />
        {role === "HR Admin" ? <Alert tone="warning" title="HR admins can invite and deactivate members." /> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(role)}>Save role</Button>
        </div>
      </div>
    </Dialog>
  );
}
