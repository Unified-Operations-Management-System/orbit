import type { AuditAction } from "@orbit/api-client";

export type { AuditAction, AuditEntry } from "@orbit/api-client";

export const actionLabels: Record<AuditAction, string> = {
  "member.invited": "Member invited",
  "member.approved": "Member approved",
  "member.deactivated": "Member deactivated",
  "role.changed": "Role changed",
  "device.registered": "Device registered",
  "device.revoked": "Device revoked",
  "settings.updated": "Settings updated",
  "permissions.updated": "Permissions updated",
};
