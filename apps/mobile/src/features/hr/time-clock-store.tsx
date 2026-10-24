import { createContext, useContext, useState, type ReactNode } from "react";

import { timeEntries, today, type TimeEntry } from "./time-attendance";

// Inception prototype: punches and correction requests kept in memory so the Home,
// Time Clock and Timecard screens agree with each other during a demo. Nothing is saved.

export type EntryFlag = "late" | "noShift" | "earlyOut";

export type Correction = {
  entryId: string;
  date: string;
  clockIn: number;
  clockOut: number;
  reason: string;
  status: "pending";
  /** Correction to a closed pay period, posted as an adjustment (UC-HR-04 ext 7.c). */
  adjustment: boolean;
};

type State = {
  /** Open time entry for today, if clocked in (UC-HR-01 post-condition). */
  openSince: number | null;
  openFlags: EntryFlag[];
  /** Today's completed entry, once clocked out (UC-HR-02). */
  todayEntry: (TimeEntry & { flags: EntryFlag[] }) | null;
  corrections: Record<string, Correction>;
  clockIn: (at: number, flags: EntryFlag[]) => void;
  clockOut: (at: number, flags: EntryFlag[]) => void;
  submitCorrection: (c: Correction) => void;
  withdrawCorrection: (entryId: string) => void;
};

const TimeClockContext = createContext<State | null>(null);

// Thursday already has a pending correction so ext 3.b (withdraw) can be shown.
const seeded: Record<string, Correction> = {
  "te-1029": { entryId: "te-1029", date: "Oct 29", clockIn: 420, clockOut: 900, reason: "Badge reader at the door was down, I started at 7:00.", status: "pending", adjustment: false },
};

export function TimeClockProvider({ children }: { children: ReactNode }) {
  const [openSince, setOpenSince] = useState<number | null>(null);
  const [openFlags, setOpenFlags] = useState<EntryFlag[]>([]);
  const [todayEntry, setTodayEntry] = useState<State["todayEntry"]>(null);
  const [corrections, setCorrections] = useState<Record<string, Correction>>(seeded);

  const value: State = {
    openSince,
    openFlags,
    todayEntry,
    corrections,
    clockIn: (at, flags) => {
      setOpenSince(at);
      setOpenFlags(flags);
      setTodayEntry(null);
    },
    clockOut: (at, flags) => {
      if (openSince === null) return;
      setTodayEntry({ id: "te-1030", date: today.date, day: "Fri", clockIn: openSince, clockOut: at, late: openFlags.includes("late"), flags: [...openFlags, ...flags] });
      setOpenSince(null);
      setOpenFlags([]);
    },
    submitCorrection: (c) => setCorrections((prev) => ({ ...prev, [c.entryId]: c })),
    withdrawCorrection: (id) =>
      setCorrections((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      }),
  };

  return <TimeClockContext value={value}>{children}</TimeClockContext>;
}

export function useTimeClock(): State {
  const ctx = useContext(TimeClockContext);
  if (!ctx) throw new Error("useTimeClock must be used inside TimeClockProvider");
  return ctx;
}

/** All entries for the timecard, including today's once clocked out. */
export function useTimecardEntries(): TimeEntry[] {
  const { todayEntry } = useTimeClock();
  return todayEntry ? [...timeEntries, todayEntry] : timeEntries;
}
