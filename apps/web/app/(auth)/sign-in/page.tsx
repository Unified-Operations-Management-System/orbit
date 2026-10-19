"use client";

import { useRouter } from "next/navigation";
import { OrbitMark } from "@/components/orbit-mark";
import { Shape } from "@/components/ui";
import { colors } from "@orbit/design-tokens";
import { roleLabels, useRole, type Role } from "@/lib/role";

const choices: { role: Role; blurb: string; shape: "circle" | "square" | "triangle"; color: string }[] = [
  { role: "owner", blurb: "Company setup, members, costs and every area", shape: "circle", color: colors.red },
  { role: "supervisor", blurb: "Team, schedules, production and stock", shape: "square", color: colors.blue },
  { role: "employee", blurb: "My shift, clock in and my tasks", shape: "triangle", color: colors.yellow },
];

export default function SignInPage() {
  const { signIn } = useRole();
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex items-center gap-3">
        <OrbitMark size={36} />
        <span className="text-2xl font-extrabold">orbit</span>
      </div>
      <div>
        <h1 className="text-[32px] font-extrabold leading-[1.05]">Sign in</h1>
        <p className="mt-2 text-muted">Prototype: pick a role to see what that user sees.</p>
      </div>
      <ul className="flex flex-col border-t-2 border-ink">
        {choices.map((c) => (
          <li key={c.role} className="border-b border-line">
            <button
              onClick={() => {
                signIn(c.role);
                router.push("/");
              }}
              className="flex w-full items-center gap-4 py-5 text-left hover:bg-surface"
            >
              <Shape shape={c.shape} color={c.color} size={24} />
              <span className="flex flex-col">
                <span className="text-lg font-bold">{roleLabels[c.role]}</span>
                <span className="text-sm text-muted">{c.blurb}</span>
              </span>
              <span aria-hidden className="ml-auto text-xl">→</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
