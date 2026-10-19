// TODO(backend): hard-coded for the Inception prototype (OAM stories SCRUM-126..133).
export type MemberRole = "Owner" | "Supervisor" | "Employee" | "HR Admin";
export type MemberStatus = "Active" | "Pending" | "Deactivated";
export type Member = { id: number; name: string; email: string; role: MemberRole; status: MemberStatus };

export const initialMembers: Member[] = [
  { id: 1, name: "Alex Morgan", email: "alex@example.com", role: "Owner", status: "Active" },
  { id: 2, name: "Jordan Lee", email: "jordan@example.com", role: "Supervisor", status: "Active" },
  { id: 3, name: "Sam Patel", email: "sam@example.com", role: "Employee", status: "Active" },
  { id: 4, name: "Riley Chen", email: "riley@example.com", role: "HR Admin", status: "Active" },
  { id: 5, name: "Casey Brown", email: "casey@example.com", role: "Employee", status: "Pending" },
  { id: 6, name: "Taylor Kim", email: "taylor@example.com", role: "Employee", status: "Deactivated" },
];

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
