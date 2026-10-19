"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useRole } from "@/lib/role";

// Sends anyone without a mock role to the sign-in screen.
export function RoleGate({ children }: { children: ReactNode }) {
  const { role, ready } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (ready && !role) router.replace("/sign-in");
  }, [ready, role, router]);

  if (!ready || !role) return null;
  return children;
}
