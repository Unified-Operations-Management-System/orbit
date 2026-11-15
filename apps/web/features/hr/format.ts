// Times come from the API in UTC and are shown in the viewer's local time zone.

const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const stamp = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** "Fri, Nov 6" */
export const formatDay = (iso: string) => day.format(new Date(iso));

/** "7:12 AM" */
export const formatTime = (iso: string) => time.format(new Date(iso));

/** "Nov 6, 4:00 PM" */
export const formatStamp = (iso: string) => stamp.format(new Date(iso));

/** "7:00 AM – 3:00 PM", or "7:00 AM – no clock-out" */
export const formatSpan = (from: string, to?: string) => `${formatTime(from)} – ${to ? formatTime(to) : "no clock-out"}`;

/** "Nov 9 – Nov 22" for a pay period, whose end is exclusive. */
export const formatPeriod = (startsAt: string, endsAt: string) =>
  `${date.format(new Date(startsAt))} – ${date.format(new Date(new Date(endsAt).getTime() - 1))}`;

/** Hours between two instants, to one decimal. */
export const hoursBetween = (from: string, to: string) => Math.round(((new Date(to).getTime() - new Date(from).getTime()) / 36e5) * 10) / 10;

/** "38.5 h" */
export const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
