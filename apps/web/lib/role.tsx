"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

// Inception prototype only: the role is picked on the sign-in screen, no real auth.
// Firebase sign-in replaces this (SCRUM-130).
export type Role = "owner" | "supervisor" | "employee";
export const roleLabels: Record<Role, string> = { owner: "Owner", supervisor: "Supervisor", employee: "Employee" };

const KEY = "orbit.role";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((l) => l());
const readRole = (): Role | null => {
  const v = localStorage.getItem(KEY);
  return v === "owner" || v === "supervisor" || v === "employee" ? v : null;
};

type RoleState = { role: Role | null; ready: boolean; signIn: (r: Role) => void; signOut: () => void };
const RoleContext = createContext<RoleState | null>(null);

// localStorage is read through useSyncExternalStore: null on the server, real value after hydration.
export function RoleProvider({ children }: { children: ReactNode }) {
  const role = useSyncExternalStore(subscribe, readRole, () => null);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);

  const signIn = (r: Role) => {
    localStorage.setItem(KEY, r);
    emit();
  };
  const signOut = () => {
    localStorage.removeItem(KEY);
    emit();
  };

  return <RoleContext value={{ role, ready, signIn, signOut }}>{children}</RoleContext>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
