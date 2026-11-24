"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Dialog, Input, Textarea } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { problemMessage, type TimeCorrection, type Timecard } from "../api";
import { formatDay, formatSpan } from "../format";

type Entry = Timecard["entries"][number];
type Shift = Timecard["missedShifts"][number];

/** "07:05" in local time, for <input type="time">. */
const hhmm = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** The local day of `dayIso` at "HH:MM", as an ISO instant. */
const at = (dayIso: string, time: string) => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(dayIso);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// The correction form on the web (UC-HR-04 steps 4-9, same rules as the mobile form): fix a
// punch's times or add a punch for a missed shift, with a reason. The API checks the times,
// overlaps and the closed-period acknowledgement; the form shows its answer.
export function RequestDialog({
  entry,
  shift,
  pending,
  closed,
  onDone,
  onClose,
}: {
  entry?: Entry;
  shift?: Shift;
  pending?: TimeCorrection;
  closed: boolean;
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const { role } = useRole();
  const day = entry?.clockIn ?? shift!.startsAt;
  const [clockIn, setClockIn] = useState(hhmm(entry?.clockIn ?? shift?.startsAt));
  const [clockOut, setClockOut] = useState(hhmm(entry?.clockOut ?? shift?.endsAt));
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const send = async () => {
    setTried(true);
    if (!role || !clockIn || !clockOut || !reason.trim() || (closed && !ack)) return;
    setBusy(true);
    const { error } = await browserApi.POST("/hr/time-corrections", {
      headers: authHeaders(role),
      body: {
        ...(entry ? { timeEntryId: entry.id } : { shiftId: shift!.id }),
        clockIn: at(day, clockIn),
        clockOut: at(day, clockOut),
        reason: reason.trim(),
        ...(closed ? { acknowledgeAdjustment: ack } : {}),
      },
    });
    setBusy(false);
    if (error) return setError(problemMessage(error));
    onDone(`Correction for ${formatDay(day)} sent to your supervisor.`);
  };

  const withdraw = async () => {
    if (!role || !pending) return;
    setBusy(true);
    const { error } = await browserApi.POST("/hr/time-corrections/{correctionId}/withdraw", {
      headers: authHeaders(role),
      params: { path: { correctionId: pending.id } },
    });
    setBusy(false);
    if (error) return setError(problemMessage(error));
    onDone(`Correction for ${formatDay(day)} withdrawn.`);
  };

  const original = entry ? formatSpan(entry.clockIn, entry.clockOut) : "No punch";

  // Ext 3.b: one pending request per punch, which can be withdrawn.
  if (pending) {
    return (
      <Dialog open onClose={onClose} title={`Correction for ${formatDay(day)}`}>
        <div className="mb-4 flex flex-col gap-3">
          <Alert tone="info" title="Waiting for your supervisor" />
          <p>
            <span className="text-muted">Recorded:</span> {original}
          </p>
          <p>
            <span className="text-muted">Requested:</span> <span className="font-bold">{formatSpan(pending.clockIn, pending.clockOut)}</span>
          </p>
          <p>
            <span className="text-muted">Reason:</span> {pending.reason}
          </p>
          {error ? <Alert tone="error" title={error} /> : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="secondary" onClick={() => void withdraw()} disabled={busy}>
            Withdraw request
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} title={shift ? `Add missing punch, ${formatDay(day)}` : `Fix times, ${formatDay(day)}`}>
      <div className="mb-4 flex flex-col gap-4">
        <p className="text-muted">
          {shift ? `Scheduled ${formatSpan(shift.startsAt, shift.endsAt)}. Enter the times you actually worked.` : `Recorded ${original}.`}
        </p>
        {closed ? (
          <Alert tone="warning" title="This pay period was already paid">
            If approved, the change posts as an adjustment in the current pay period.
          </Alert>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Clock in" type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} error={tried && !clockIn ? "Required" : undefined} />
          <Input label="Clock out" type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} error={tried && !clockOut ? "Required" : undefined} />
        </div>
        <Textarea
          label="Reason"
          placeholder="e.g. Forgot to clock out after the line stopped"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={tried && !reason.trim() ? "A reason is required." : undefined}
        />
        {closed ? (
          <div>
            <Checkbox label="I understand, post it as an adjustment" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            {tried && !ack ? <p className="mt-1 text-sm text-red">Confirm the adjustment to continue.</p> : null}
          </div>
        ) : null}
        {error ? <Alert tone="error" title={error} /> : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void send()} disabled={busy}>
          {busy ? "Sending…" : "Send request"}
        </Button>
      </div>
    </Dialog>
  );
}
