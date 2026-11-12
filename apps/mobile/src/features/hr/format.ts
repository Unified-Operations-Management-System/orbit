// Formatting for HR screens. The API sends UTC; screens show the device's local time.

const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

export function formatTime(d: Date | string): string {
  const t = toDate(d);
  const h = t.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(t.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon Nov 9" */
export function formatDay(d: Date | string): string {
  const t = toDate(d);
  return `${DAYS[t.getDay()]} ${MONTHS[t.getMonth()]} ${t.getDate()}`;
}

/** "Nov 2 – 15" or "Oct 26 – Nov 8" for [start, end). */
export function formatRange(start: Date | string, endExclusive: Date | string): string {
  const a = toDate(start);
  const b = new Date(toDate(endExclusive).getTime() - 1);
  const left = `${MONTHS[a.getMonth()]} ${a.getDate()}`;
  return a.getMonth() === b.getMonth() ? `${left} – ${b.getDate()}` : `${left} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}

export const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, "")} h`;

export const hoursBetween = (a: Date | string, b: Date | string) =>
  Math.round(((toDate(b).getTime() - toDate(a).getTime()) / 3_600_000) * 100) / 100;

export const sameDay = (a: Date | string, b: Date | string) => toDate(a).toDateString() === toDate(b).toDateString();

/** Local midnight on the Monday of d's week. */
export function startOfWeek(d: Date): Date {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return t;
}

export function addDays(d: Date, n: number): Date {
  const t = new Date(d);
  t.setDate(t.getDate() + n);
  return t;
}

/** Parses "3:00 PM", "3 pm" or "15:00" into minutes after midnight, or null. */
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

/** The local date of day at minutes after midnight. */
export function atMinutes(day: Date | string, minutes: number): Date {
  const t = toDate(day);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate(), Math.floor(minutes / 60), minutes % 60);
}
