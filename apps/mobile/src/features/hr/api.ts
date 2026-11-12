import type { components } from "@orbit/api-client";
import { useQueryClient } from "@tanstack/react-query";

// HR Time and Attendance on the Go API (/hr/*). Types come from the OpenAPI contract.
export type Shift = components["schemas"]["Shift"];
export type TimeOff = components["schemas"]["TimeOff"];
export type TimeEntry = components["schemas"]["TimeEntry"];
export type TimeCorrection = components["schemas"]["TimeCorrection"];
export type Timecard = components["schemas"]["Timecard"];
export type ClockStatus = components["schemas"]["ClockStatus"];
export type PayPeriod = components["schemas"]["PayPeriod"];

/**
 * A readable message from an API error: the field message for 422, the detail for
 * 409/404, and "not saved" when the request never reached the server (UC-HR-01 ext 7.a).
 */
export function problemMessage(err: unknown): string {
  if (err instanceof Error) return "Not saved. Check your connection and try again.";
  if (err && typeof err === "object") {
    const p = err as { detail?: string; errors?: { message: string }[] };
    if (p.errors?.length) return p.errors.map((e) => e.message).join(" ");
    if (p.detail) return p.detail.charAt(0).toUpperCase() + p.detail.slice(1) + ".";
  }
  return "Something went wrong. Try again.";
}

/** After a punch or a correction, refetch every HR screen (status, schedule, timecard). */
export function useRefreshHr() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes("/hr/") });
}
