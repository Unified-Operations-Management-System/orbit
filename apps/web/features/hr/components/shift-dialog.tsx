"use client";

import { useId, useState } from "react";
import { Alert, Button, Dialog, Input, Select, Textarea } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { problemMessage, type HrEmployee, type Shift } from "../api";
import { formatDay } from "../format";
import { addDays, fromInputs, toDateInput, toTimeInput } from "../week";

// Add or change one shift (SCRUM-14). A shift that ends at or before its start time runs
// past midnight. The API checks the rules (team, overlap, length, not in the past) and
// this form shows its answer.
export function ShiftDialog({
  shift,
  memberId: forMember,
  day,
  people,
  stations,
  onDone,
  onClose,
}: {
  shift?: Shift;
  memberId?: string;
  day?: Date;
  people: HrEmployee[];
  stations: string[];
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const { role } = useRole();
  const listId = useId();
  const startsAt = shift ? new Date(shift.startsAt) : undefined;
  const [memberId, setMemberId] = useState(shift?.memberId ?? forMember ?? "");
  const [date, setDate] = useState(toDateInput(startsAt ?? day ?? new Date()));
  const [start, setStart] = useState(startsAt ? toTimeInput(startsAt) : "07:00");
  const [end, setEnd] = useState(shift ? toTimeInput(new Date(shift.endsAt)) : "15:00");
  const [station, setStation] = useState(shift?.station ?? "");
  const [notes, setNotes] = useState(shift?.notes ?? "");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const name = shift?.memberName ?? people.find((p) => p.id === memberId)?.name ?? "the employee";

  const save = async () => {
    setTried(true);
    if (!role || !memberId || !date || !start || !end || !station.trim()) return;
    const from = fromInputs(date, start);
    let to = fromInputs(date, end);
    if (to <= from) to = addDays(to, 1); // overnight shift
    setBusy(true);
    const times = { startsAt: from.toISOString(), endsAt: to.toISOString(), station: station.trim(), notes: notes.trim() };
    const { error } = shift
      ? await browserApi.PATCH("/hr/shifts/{shiftId}", { headers: authHeaders(role), params: { path: { shiftId: shift.id } }, body: times })
      : await browserApi.POST("/hr/shifts", { headers: authHeaders(role), body: { memberId, ...times } });
    setBusy(false);
    if (error) return setError(problemMessage(error));
    onDone(shift ? `Saved ${name}'s shift on ${formatDay(from.toISOString())}.` : `Added a draft shift for ${name} on ${formatDay(from.toISOString())}.`);
  };

  // Only drafts can be deleted; a published shift is moved instead so the employee is told.
  const remove = async () => {
    if (!role || !shift) return;
    setBusy(true);
    const { error } = await browserApi.DELETE("/hr/shifts/{shiftId}", { headers: authHeaders(role), params: { path: { shiftId: shift.id } } });
    setBusy(false);
    if (error) return setError(problemMessage(error));
    onDone(`Deleted the draft shift for ${name} on ${formatDay(shift.startsAt)}.`);
  };

  return (
    <Dialog open onClose={onClose} title={shift ? `${name}, ${formatDay(shift.startsAt)}` : "Add a shift"}>
      <div className="mb-4 flex flex-col gap-4">
        {shift?.published ? (
          <Alert tone="info" title={`${name} can see this shift`}>
            If you change the time or station, their app shows it as Updated with what changed.
          </Alert>
        ) : null}
        {shift ? null : (
          <Select
            label="Employee"
            value={memberId}
            onChange={setMemberId}
            placeholder="Choose someone"
            error={tried && !memberId ? "Required" : undefined}
            options={people.map((p) => ({ value: p.id, label: p.teamName ? `${p.name} · ${p.teamName}` : p.name }))}
          />
        )}
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={tried && !date ? "Required" : undefined} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start" type="time" value={start} onChange={(e) => setStart(e.target.value)} error={tried && !start ? "Required" : undefined} />
          <Input label="End" type="time" value={end} onChange={(e) => setEnd(e.target.value)} error={tried && !end ? "Required" : undefined} />
        </div>
        <Input
          label="Station"
          placeholder="e.g. Packing Line 2"
          list={listId}
          maxLength={80}
          value={station}
          onChange={(e) => setStation(e.target.value)}
          error={tried && !station.trim() ? "Required" : undefined}
        />
        <datalist id={listId}>
          {stations.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Textarea label="Notes (optional)" placeholder="e.g. Allergen changeover at noon" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error ? <Alert tone="error" title={error} /> : null}
      </div>
      <div className="flex justify-end gap-2">
        {shift && !shift.published ? (
          <Button variant="secondary" className="mr-auto" onClick={() => void remove()} disabled={busy}>
            Delete draft
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : shift ? "Save changes" : "Add shift"}
        </Button>
      </div>
    </Dialog>
  );
}
