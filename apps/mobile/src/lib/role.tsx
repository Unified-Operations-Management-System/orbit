import { createContext, useContext, useState, type ReactNode } from "react";

// Inception prototype only: mock role, kept in memory. Firebase sign-in replaces it (SCRUM-130).
export type Role = "owner" | "supervisor" | "employee";
export const roleLabels: Record<Role, string> = { owner: "Owner", supervisor: "Supervisor", employee: "Employee" };

type RoleState = { role: Role | null; signIn: (r: Role) => void; signOut: () => void };
const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  return <RoleContext value={{ role, signIn: setRole, signOut: () => setRole(null) }}>{children}</RoleContext>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
