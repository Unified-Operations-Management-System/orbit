"use client";

import { useEffect, useState } from "react";
import { browserApi } from "@/lib/api";

// Client Component: calls Go from the browser through the /api rewrite.
export function HealthBadge() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    browserApi
      .GET("/health")
      .then(({ data }) => setStatus(data?.status === "ok" ? "ok" : "down"))
      .catch(() => setStatus("down"));
  }, []);

  const color = { checking: "bg-neutral-400", ok: "bg-green-500", down: "bg-red-500" }[status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700">
      <span className={`size-2 rounded-full ${color}`} />
      Go API: {status}
    </span>
  );
}
