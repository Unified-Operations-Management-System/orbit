import type { MemberRole } from "@orbit/api-client";

export type { Member, MemberRole, MemberStatus } from "@orbit/api-client";

export const memberRoles: MemberRole[] = ["Owner", "Supervisor", "Employee", "HR Admin"];

// Permission matrix shown read-only (story J defines the real one).
export const permissions: { action: string; allowed: MemberRole[] }[] = [
  { action: "Edit company profile and settings", allowed: ["Owner"] },
  { action: "Invite and deactivate members", allowed: ["Owner", "HR Admin"] },
  { action: "Assign roles", allowed: ["Owner"] },
  { action: "Build and publish schedules", allowed: ["Owner", "Supervisor"] },
  { action: "Approve time cards", allowed: ["Supervisor", "HR Admin"] },
  { action: "View costs and margins", allowed: ["Owner"] },
  { action: "Clock in and view own shift", allowed: ["Owner", "Supervisor", "Employee", "HR Admin"] },
];
