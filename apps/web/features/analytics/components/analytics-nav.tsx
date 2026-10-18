"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/analytics", label: "Overview", exact: true },
  { href: "/analytics/purchase-orders", label: "Purchase orders" },
  { href: "/analytics/shipments", label: "Shipments and landed cost" },
];

// Second-level navigation inside the Cost Analytics area.
export function AnalyticsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Cost Analytics" className="flex gap-4 border-b border-neutral-200 text-sm dark:border-neutral-800">
      {links.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "-mb-px border-b-2 border-foreground pb-2 font-medium"
                : "pb-2 text-neutral-500 hover:text-foreground"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
