// Top-level navigation, one entry per domain. When a feature gets its first page under
// app/(dashboard)/<domain>/, add it here, e.g. { href: "/inventory", label: "Inventory" }.
export type NavItem = { href: string; label: string };

export const navItems: NavItem[] = [{ href: "/", label: "Todos" }];
