import { createContext, useContext, useState, type ReactNode } from "react";

import { setAuthToken } from "@/lib/api";
import { queryClient } from "@/lib/query-client";

// Development sign-in: the picked role is kept in memory and sent to the API as a dev:<role>
// token, so the app shows that seeded member's data. Firebase sign-in replaces it (SCRUM-130).
export type Role = "owner" | "supervisor" | "employee";
export const roleLabels: Record<Role, string> = { owner: "Owner", supervisor: "Supervisor", employee: "Employee" };

type RoleState = { role: Role | null; signIn: (r: Role) => void; signOut: () => void };
const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const signIn = (r: Role) => {
    setAuthToken(`dev:${r}`);
    queryClient.clear(); // never show the previous role's data
    setRole(r);
  };
  const signOut = () => {
    setAuthToken(null);
    queryClient.clear();
    setRole(null);
  };
  return <RoleContext value={{ role, signIn, signOut }}>{children}</RoleContext>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
