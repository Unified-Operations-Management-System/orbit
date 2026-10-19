import type { Area } from "@orbit/design-tokens";
import type { Role } from "@/lib/role";

// Sidebar navigation, one entry per functional area. `roles` controls who sees it
// (mock roles for the Inception prototype).
export type NavItem = { href: string; label: string; area?: Area; roles: Role[] };

const all: Role[] = ["owner", "supervisor", "employee"];

export const navItems: NavItem[] = [
  { href: "/", label: "Home", roles: all },
  { href: "/settings/organization", label: "Organization", area: "organization", roles: ["owner"] },
  { href: "/hr", label: "HR", area: "hr", roles: all },
  { href: "/production", label: "Process", area: "production", roles: ["owner", "supervisor"] },
  { href: "/inventory", label: "Inventory", area: "inventory", roles: ["owner", "supervisor"] },
  { href: "/analytics", label: "Cost", area: "analytics", roles: ["owner"] },
];
