"use client";

import { Alert, Button, Dialog } from "@/components/ui";
import type { TimeCorrection } from "../api";
import { formatDay, formatHours, formatSpan, formatStamp, hoursBetween } from "../format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-t border-line py-2">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// UC-HR-04 from the reviewer's side (SCRUM-172): the request next to what was recorded and
// scheduled, then approve or reject. The API decides who may review (never the requester).
export function ReviewDialog({
  correction: c,
  busy,
  error,
  onApprove,
  onReject,
  onClose,
}: {
  correction: TimeCorrection;
  busy: boolean;
  error?: string;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const requested = hoursBetween(c.clockIn, c.clockOut);
  const recorded = c.punchClockIn && c.punchClockOut ? hoursBetween(c.punchClockIn, c.punchClockOut) : 0;
  const change = Math.round((requested - recorded) * 10) / 10;

  return (
    <Dialog open onClose={onClose} title="Review time correction">
      <dl className="mb-4 border-b border-line">
        <Row label="Employee">{c.memberName}</Row>
        <Row label="Day">{formatDay(c.clockIn)}</Row>
        <Row label="Scheduled">{c.shiftStartsAt && c.shiftEndsAt ? formatSpan(c.shiftStartsAt, c.shiftEndsAt) : "No scheduled shift"}</Row>
        <Row label="Recorded">{c.punchClockIn ? formatSpan(c.punchClockIn, c.punchClockOut) : "No punch (missing entry)"}</Row>
        <Row label="Requested">
          <span className="font-bold">{formatSpan(c.clockIn, c.clockOut)}</span>
          <span className="text-muted">
            {" "}
            · {formatHours(requested)}
            {change !== 0 ? ` (${change > 0 ? "+" : ""}${formatHours(change)})` : ""}
          </span>
        </Row>
        <Row label="Reason">{c.reason}</Row>
        <Row label="Submitted">{formatStamp(c.submittedAt)}</Row>
      </dl>
      {c.adjustment ? (
        <div className="mb-4">
          <Alert tone="warning" title="Closed pay period">
            This day was already paid. If approved, the hours post as an adjustment in the current period.
          </Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4">
          <Alert tone="error" title={error} />
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onReject} disabled={busy}>
          Reject
        </Button>
        <Button onClick={onApprove} disabled={busy}>
          Approve
        </Button>
      </div>
    </Dialog>
  );
}
