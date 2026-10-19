import type { Status } from "@/theme";

// TODO(backend): hard-coded for the Inception prototype.
export const todayShift = { label: "Shift A", time: "7:00 AM – 3:00 PM", station: "Mixing line 2" };

export const myTasks: { name: string; status: Status }[] = [
  { name: "Weigh flour for Batch 113", status: "onTrack" },
  { name: "Sanitize mixer 2", status: "done" },
  { name: "Label cases for Batch 109", status: "slowed" },
  { name: "Restock packaging film", status: "stalled" },
];

export const week: { day: string; time: string }[] = [
  { day: "Mon", time: "7:00 AM – 3:00 PM" },
  { day: "Tue", time: "7:00 AM – 3:00 PM" },
  { day: "Wed", time: "Off" },
  { day: "Thu", time: "11:00 AM – 7:00 PM" },
  { day: "Fri", time: "11:00 AM – 7:00 PM" },
];
