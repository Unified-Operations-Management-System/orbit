import type { components, Problem } from "@orbit/api-client";

// HR Management types from the API contract (packages/api-spec, tag "hr").
export type TimeCorrection = components["schemas"]["TimeCorrection"];
export type CorrectionStatus = components["schemas"]["TimeCorrectionStatus"];
export type HrEmployee = components["schemas"]["HrEmployee"];
export type PayPeriod = components["schemas"]["PayPeriod"];
export type Timecard = components["schemas"]["Timecard"];
export type Shift = components["schemas"]["Shift"];
export type Schedule = components["schemas"]["Schedule"];

export const correctionStatuses: CorrectionStatus[] = ["Pending", "Approved", "Rejected", "Withdrawn"];

/** First field error, else the problem's detail. */
export const problemMessage = (p: Problem | undefined) => p?.errors?.[0]?.message ?? p?.detail ?? "Something went wrong.";
