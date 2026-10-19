"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { OrbitMark } from "@/components/orbit-mark";
import { AreaIcon } from "@/components/ui";
import { roleLabels, useRole } from "@/lib/role";
import { navItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, signOut } = useRole();
  const items = navItems.filter((i) => role && i.roles.includes(role));

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-ink py-5 text-paper">
      <div className="flex items-center gap-2.5 px-5 pb-6">
        <OrbitMark onDark />
        <span className="text-xl font-bold">orbit</span>
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map(({ href, label, area }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`mx-2.5 flex items-center gap-3 px-3 py-2.5 text-[15px] ${
                active ? "bg-paper font-bold text-ink" : "font-medium hover:bg-paper/10"
              }`}
            >
              {area ? (
                <AreaIcon area={area} size={14} onDark={!active} />
              ) : (
                <span aria-hidden className={`size-3.5 ${active ? "bg-ink" : "bg-paper"}`} />
              )}
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 pt-6 text-sm">
        <div className="text-muted-ink">Signed in as</div>
        <div className="font-bold">{role ? roleLabels[role] : ""}</div>
        <button
          onClick={() => {
            signOut();
            router.replace("/sign-in");
          }}
          className="mt-2 text-muted-ink underline hover:text-paper"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
