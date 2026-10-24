// Sample data and rules for the HR Time and Attendance prototype (Inception release).
// Use cases: UC-HR-01 Clock In, UC-HR-02 Clock Out, UC-HR-03 View Upcoming Shifts,
// UC-HR-04 Request Time Correction. Author: Suthakaran Siva.
// TODO(backend): replaced by the HR endpoints once they exist; the API will own these rules.

// ---------- time helpers (minutes since midnight) ----------

export function formatTime(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

/** Parses "3:00 PM", "3 pm" or "15:00". Returns minutes since midnight, or null. */
export function parseTime(text: string): number | null {
  const m = text.trim().toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    if (m[3] === "AM" && h === 12) h = 0;
    if (m[3] === "PM" && h !== 12) h += 12;
  } else if (h > 23) return null;
  return h * 60 + min;
}

export const hours = (fromMin: number, toMin: number) => Math.round(((toMin - fromMin) / 60) * 100) / 100;
export const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, "")} h`;

// ---------- pay and time rules (set by the HR Administrator, Configure Pay and Time Rules) ----------

export const rules = {
  /** Earliest clock-in is this many minutes before the shift starts (UC-HR-01 ext 4.a). */
  clockInWindowMin: 15,
  /** Weekly hours above this are overtime (UC-HR-02 ext 4.b). */
  overtimeThresholdHours: 40,
  /** An open entry longer than this means a clock-out was probably missed (UC-HR-02 ext 2.b). */
  maxShiftHours: 12,
};

// ---------- people ----------

export const employee = { name: "Priya", fullName: "Priya Sharma", supervisor: "Marcus Lee" };

// ---------- schedule (UC-HR-03) ----------

export type ShiftStatus = "scheduled" | "updated" | "timeOff";

export type Shift = {
  id: string;
  week: "this" | "next";
  day: string;
  date: string;
  start: number;
  end: number;
  station: string;
  supervisor: string;
  notes: string;
  status: ShiftStatus;
  /** Shown on updated shifts: what changed since the employee last looked (ext 2.b). */
  change?: string;
};

const sup = employee.supervisor;

export const shifts: Shift[] = [
  { id: "sh-1026", week: "this", day: "Mon", date: "Oct 26", start: 420, end: 900, station: "Packing Line 2", supervisor: sup, notes: "", status: "scheduled" },
  { id: "sh-1027", week: "this", day: "Tue", date: "Oct 27", start: 420, end: 900, station: "Packing Line 2", supervisor: sup, notes: "", status: "scheduled" },
  { id: "sh-1028", week: "this", day: "Wed", date: "Oct 28", start: 420, end: 900, station: "Mixing Line 1", supervisor: sup, notes: "Covering for a teammate on Mixing.", status: "scheduled" },
  { id: "sh-1029", week: "this", day: "Thu", date: "Oct 29", start: 420, end: 900, station: "Packing Line 2", supervisor: sup, notes: "", status: "scheduled" },
  { id: "sh-1030", week: "this", day: "Fri", date: "Oct 30", start: 420, end: 900, station: "Packing Line 2", supervisor: sup, notes: "Allergen changeover at noon. Wear a fresh hairnet after lunch.", status: "scheduled" },
  { id: "sh-1102", week: "next", day: "Mon", date: "Nov 2", start: 660, end: 1140, station: "Packing Line 2", supervisor: sup, notes: "", status: "updated", change: "Moved from 7:00 AM to 11:00 AM" },
  { id: "sh-1103", week: "next", day: "Tue", date: "Nov 3", start: 660, end: 1140, station: "Packing Line 2", supervisor: sup, notes: "", status: "scheduled" },
  { id: "sh-1104", week: "next", day: "Wed", date: "Nov 4", start: 0, end: 0, station: "", supervisor: sup, notes: "Approved vacation day.", status: "timeOff" },
  { id: "sh-1105", week: "next", day: "Thu", date: "Nov 5", start: 420, end: 900, station: "Shipping Dock", supervisor: sup, notes: "Forklift-certified staff only on the dock.", status: "updated", change: "Station changed from Packing Line 2" },
  { id: "sh-1106", week: "next", day: "Fri", date: "Nov 6", start: 420, end: 900, station: "Packing Line 2", supervisor: sup, notes: "", status: "scheduled" },
];

export const weekLabels = { this: "This week · Oct 26 – Nov 1", next: "Next week · Nov 2 – 8" } as const;

/** "Today" in the prototype is Friday, Oct 30. */
export const today = { date: "Oct 30", label: "Friday, Oct 30" };
export const todayShift = shifts.find((s) => s.date === today.date) ?? null;

// ---------- timecard (UC-HR-04) ----------

export type TimeEntry = {
  id: string;
  date: string;
  day: string;
  /** null when the whole shift has no entry (ext 3.a). */
  clockIn: number | null;
  /** null when the clock-out is missing. */
  clockOut: number | null;
  late?: boolean;
  /** Set on entries in the closed pay period (ext 7.c). */
  closedPeriod?: boolean;
};

export const payPeriod = { label: "Oct 19 – Nov 1", payDate: "Nov 6" };

// Hours already worked earlier this week, before today's shift. Used for the overtime check.
export const hoursThisWeekBeforeToday = 33.5;

export const timeEntries: TimeEntry[] = [
  // Previous pay period (closed): corrections post as adjustments in the current period.
  { id: "te-1016", date: "Oct 16", day: "Fri", clockIn: 420, clockOut: 900, closedPeriod: true },
  // This pay period, week 1.
  { id: "te-1019", date: "Oct 19", day: "Mon", clockIn: 418, clockOut: 902 },
  { id: "te-1020", date: "Oct 20", day: "Tue", clockIn: 421, clockOut: 899 },
  { id: "te-1022a", date: "Oct 22", day: "Thu", clockIn: 420, clockOut: 660 },
  { id: "te-1022b", date: "Oct 22", day: "Thu", clockIn: 690, clockOut: 900 },
  { id: "te-1023", date: "Oct 23", day: "Fri", clockIn: 419, clockOut: 901 },
  // This pay period, week 2.
  { id: "te-1026", date: "Oct 26", day: "Mon", clockIn: 417, clockOut: 903 },
  { id: "te-1027", date: "Oct 27", day: "Tue", clockIn: 418, clockOut: null },
  { id: "te-1028", date: "Oct 28", day: "Wed", clockIn: null, clockOut: null },
  { id: "te-1029", date: "Oct 29", day: "Thu", clockIn: 425, clockOut: 990, late: true },
];

export const entryHours = (e: { clockIn: number | null; clockOut: number | null }) =>
  e.clockIn !== null && e.clockOut !== null ? hours(e.clockIn, e.clockOut) : 0;

// ---------- clock-in rules (UC-HR-01 steps 4 and 2.b) ----------

export type ClockInCheck =
  | { kind: "tooEarly"; earliest: number }
  | { kind: "ok"; late: boolean; noShift: boolean };

export function checkClockIn(now: number, shift: Shift | null): ClockInCheck {
  if (!shift) return { kind: "ok", late: false, noShift: true };
  const earliest = shift.start - rules.clockInWindowMin;
  if (now < earliest) return { kind: "tooEarly", earliest };
  return { kind: "ok", late: now > shift.start, noShift: false };
}

// ---------- clock-out summary (UC-HR-02 steps 4, 4.a, 4.b) ----------

export function clockOutSummary(clockIn: number, now: number, shift: Shift | null) {
  const worked = hours(clockIn, now);
  const weekTotal = hoursThisWeekBeforeToday + worked;
  const overtime = Math.max(0, Math.round((weekTotal - rules.overtimeThresholdHours) * 100) / 100);
  return {
    worked,
    regular: Math.round((worked - Math.min(worked, overtime)) * 100) / 100,
    overtime: Math.min(worked, overtime),
    earlyOut: shift !== null && now < shift.end,
    weekTotal,
  };
}

// ---------- correction rules (UC-HR-04 step 7) ----------

export type CorrectionInput = { entryId: string; date: string; clockIn: number; clockOut: number };

/** Returns the first problem, or null if the correction can be submitted. */
export function correctionProblem(c: CorrectionInput, entries: TimeEntry[]): string | null {
  if (c.clockOut <= c.clockIn) return "Clock-out must be after clock-in.";
  const clash = entries.find(
    (e) =>
      e.id !== c.entryId &&
      e.date === c.date &&
      e.clockIn !== null &&
      e.clockOut !== null &&
      c.clockIn < e.clockOut &&
      c.clockOut > e.clockIn,
  );
  if (clash) return `These times overlap your other entry on ${clash.day} ${clash.date} (${formatTime(clash.clockIn!)} – ${formatTime(clash.clockOut!)}).`;
  return null;
}

// ---------- demo times ----------
// The prototype has no real clock, so the Time Clock screen lets the presenter pick
// "the current time" to walk through each use-case extension.

export const clockInDemoTimes = [
  { value: "390", label: "6:30 AM" }, // too early (ext 4.a)
  { value: "415", label: "6:55 AM" }, // on time
  { value: "432", label: "7:12 AM" }, // late (ext 4.b)
];

export const clockOutDemoTimes = [
  { value: "810", label: "1:30 PM" }, // early out (ext 4.a)
  { value: "904", label: "3:04 PM" }, // on time, pushes the week into overtime (ext 4.b)
];
