"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {navItems.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-neutral-200 px-3 py-1.5 text-sm font-medium dark:bg-neutral-800"
                : "rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:text-foreground"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
