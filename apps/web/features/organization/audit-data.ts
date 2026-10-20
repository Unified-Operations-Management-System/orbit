// TODO(backend): hard-coded for the Inception prototype.
export type AuditAction =
  | "member.invited"
  | "member.approved"
  | "member.deactivated"
  | "role.changed"
  | "device.registered"
  | "device.revoked"
  | "settings.updated";

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  summary: string;
};

export const actionLabels: Record<AuditAction, string> = {
  "member.invited": "Member invited",
  "member.approved": "Member approved",
  "member.deactivated": "Member deactivated",
  "role.changed": "Role changed",
  "device.registered": "Device registered",
  "device.revoked": "Device revoked",
  "settings.updated": "Settings updated",
};

export const auditEntries: AuditEntry[] = [
  { id: "a01", at: "2026-10-14T09:12:00", actor: "Alex Morgan", action: "settings.updated", summary: "Updated company profile" },
  { id: "a02", at: "2026-10-14T10:02:00", actor: "Alex Morgan", action: "member.invited", summary: "Invited casey@example.com as Employee" },
  { id: "a03", at: "2026-10-14T14:47:00", actor: "Riley Chen", action: "device.registered", summary: "Registered Supervisor iPad" },
  { id: "a04", at: "2026-10-15T08:31:00", actor: "Riley Chen", action: "member.approved", summary: "Approved Casey Brown's account" },
  { id: "a05", at: "2026-10-15T09:20:00", actor: "Alex Morgan", action: "role.changed", summary: "Changed Riley Chen's role to HR Admin" },
  { id: "a06", at: "2026-10-15T11:05:00", actor: "Alex Morgan", action: "member.deactivated", summary: "Deactivated Taylor Kim" },
  { id: "a07", at: "2026-10-15T16:40:00", actor: "Alex Morgan", action: "device.revoked", summary: "Revoked Loading dock phone" },
  { id: "a08", at: "2026-10-16T08:05:00", actor: "Riley Chen", action: "member.invited", summary: "Invited noa@example.com as Employee" },
  { id: "a09", at: "2026-10-16T09:58:00", actor: "Alex Morgan", action: "device.registered", summary: "Registered Mixing line tablet" },
  { id: "a10", at: "2026-10-16T13:12:00", actor: "Riley Chen", action: "settings.updated", summary: "Updated password requirements" },
  { id: "a11", at: "2026-10-17T07:44:00", actor: "Alex Morgan", action: "role.changed", summary: "Changed Dana Ellis's role to Supervisor" },
  { id: "a12", at: "2026-10-17T10:26:00", actor: "Riley Chen", action: "member.invited", summary: "Invited dana@example.com as Employee" },
  { id: "a13", at: "2026-10-17T15:03:00", actor: "Alex Morgan", action: "device.revoked", summary: "Revoked Visitor tablet" },
  { id: "a14", at: "2026-10-18T08:15:00", actor: "Riley Chen", action: "member.approved", summary: "Approved Dana Ellis's account" },
  { id: "a15", at: "2026-10-18T09:36:00", actor: "Alex Morgan", action: "member.invited", summary: "Invited lee@example.com as Employee" },
  { id: "a16", at: "2026-10-18T11:52:00", actor: "Riley Chen", action: "device.registered", summary: "Registered Packaging tablet" },
  { id: "a17", at: "2026-10-18T14:21:00", actor: "Alex Morgan", action: "settings.updated", summary: "Changed default role for new invites to Employee" },
  { id: "a18", at: "2026-10-18T17:08:00", actor: "Riley Chen", action: "member.deactivated", summary: "Deactivated Quinn Reyes" },
  { id: "a19", at: "2026-10-19T07:52:00", actor: "Alex Morgan", action: "device.registered", summary: "Registered Visitor tablet" },
  { id: "a20", at: "2026-10-19T09:04:00", actor: "Riley Chen", action: "member.approved", summary: "Approved Lee Park's account" },
  { id: "a21", at: "2026-10-19T10:31:00", actor: "Alex Morgan", action: "role.changed", summary: "Changed Sam Patel's role to Supervisor" },
  { id: "a22", at: "2026-10-19T12:47:00", actor: "Riley Chen", action: "settings.updated", summary: "Updated session timeout policy" },
  { id: "a23", at: "2026-10-19T15:19:00", actor: "Alex Morgan", action: "device.revoked", summary: "Revoked Visitor tablet" },
  { id: "a24", at: "2026-10-19T17:38:00", actor: "Riley Chen", action: "member.invited", summary: "Invited morgan@example.com as Employee" },
];

export const auditActors = ["Alex Morgan", "Riley Chen"];
