import type { MemberRole, PermissionAction } from "@orbit/api-client";

export type { Member, MemberRole, MemberStatus } from "@orbit/api-client";

export const memberRoles: MemberRole[] = ["Owner", "Supervisor", "Employee", "HR Admin"];

// Display names for the roles matrix rows; the matrix itself comes from the API.
export const permissionLabels: Record<PermissionAction, string> = {
  "company.edit": "Edit company profile and settings",
  "members.manage": "Invite, approve and deactivate members",
  "roles.assign": "Assign roles",
  "schedules.publish": "Build and publish schedules",
  "timecards.approve": "Approve time cards",
  "costs.view": "View costs and margins",
  "shift.clock": "Clock in and view own shift",
};
