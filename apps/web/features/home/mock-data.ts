import type { ColorToken, Status } from "@orbit/design-tokens";
import type { Role } from "@/lib/role";

// TODO(backend): hard-coded for the Inception prototype; replace with API data.
type Stat = { label: string; value: string; accent: ColorToken; alert?: boolean };

export const statsByRole: Record<Role, Stat[]> = {
  owner: [
    { label: "Yield today", value: "94.2%", accent: "blue" },
    { label: "Low stock", value: "3", accent: "yellow", alert: true },
    { label: "On floor", value: "14", accent: "red" },
  ],
  supervisor: [
    { label: "Team on shift", value: "14", accent: "blue" },
    { label: "Tasks behind", value: "2", accent: "yellow", alert: true },
    { label: "Open requests", value: "4", accent: "red" },
  ],
  employee: [
    { label: "Shift", value: "7–3", accent: "blue" },
    { label: "Tasks today", value: "5", accent: "yellow" },
    { label: "Hours this week", value: "24", accent: "red" },
  ],
};

export const processRuns: { name: string; status: Status }[] = [
  { name: "Mixing · Batch 112", status: "onTrack" },
  { name: "Packaging · Batch 109", status: "slowed" },
  { name: "Labeling · Batch 108", status: "stalled" },
  { name: "Palletizing · Batch 105", status: "done" },
];

export const myTasks: { name: string; status: Status }[] = [
  { name: "Weigh flour for Batch 113", status: "onTrack" },
  { name: "Sanitize mixer 2", status: "done" },
  { name: "Label cases for Batch 109", status: "slowed" },
];
