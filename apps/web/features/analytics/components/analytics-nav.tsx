"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/analytics", label: "Overview", exact: true },
  { href: "/analytics/purchase-orders", label: "Purchase orders" },
  { href: "/analytics/shipments", label: "Shipments and landed cost" },
];

// Second-level navigation inside the Cost Analytics area. Links rather than Tabs because each
// entry is its own route; the look matches Tabs (red underline on the active entry).
export function AnalyticsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Cost Analytics" className="flex gap-6 border-b border-line">
      {links.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-4 py-2 text-[15px] font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
              active ? "border-red text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
