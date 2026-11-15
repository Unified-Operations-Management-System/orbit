"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, EmptyState, Panel, SearchInput, Select, stickyHeadCell } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { correctionStatuses, problemMessage, type CorrectionStatus, type TimeCorrection } from "../api";
import { formatDay, formatSpan } from "../format";
import { CorrectionStatusLabel } from "./correction-status";
import { ReviewDialog } from "./review-dialog";

type StatusFilter = CorrectionStatus | "All";

// SCRUM-172: supervisors and the owner review time corrections (UC-HR-04 ext 8). The API
// scopes the list (an employee's own, a supervisor's team, the whole company for the owner)
// and enforces who may approve; this screen only shows the answers.
export function CorrectionsView({ initialQuery = "" }: { initialQuery?: string }) {
  const { role } = useRole();
  const canReview = role === "owner" || role === "supervisor";
  // Reviewers start with their queue; employees with everything they've asked for.
  const [status, setStatus] = useState<StatusFilter>(canReview ? "Pending" : "All");
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<TimeCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reviewing, setReviewing] = useState<TimeCorrection | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  useEffect(() => {
    if (!role) return;
    let live = true;
    void browserApi
      .GET("/hr/time-corrections", { headers: authHeaders(role), params: { query: status === "All" ? {} : { status } } })
      .then(({ data, error }) => {
        if (!live) return;
        setLoading(false);
        if (error) return setLoadError(problemMessage(error));
        setLoadError(undefined);
        setItems(data);
      });
    return () => {
      live = false;
    };
  }, [role, status]);

  // A reviewed request leaves the Pending list right away.
  const visible = useMemo(
    () =>
      items.filter(
        (c) => (status === "All" || c.status === status) && (!query || c.memberName.toLowerCase().includes(query.toLowerCase())),
      ),
    [items, status, query],
  );
  const pending = items.filter((c) => c.status === "Pending").length;

  const review = async (c: TimeCorrection, decision: "approve" | "reject") => {
    if (!role) return;
    setBusy(true);
    const init = { headers: authHeaders(role), params: { path: { correctionId: c.id } } };
    const { data, error } =
      decision === "approve"
        ? await browserApi.POST("/hr/time-corrections/{correctionId}/approve", init)
        : await browserApi.POST("/hr/time-corrections/{correctionId}/reject", init);
    setBusy(false);
    if (error) return setActionError(problemMessage(error));
    setItems((all) => all.map((x) => (x.id === data.id ? { ...x, ...data } : x)));
    setReviewing(null);
    setActionError(undefined);
    setNotice(`${decision === "approve" ? "Approved" : "Rejected"} ${c.memberName}'s correction for ${formatDay(c.clockIn)}.`);
  };

  const close = () => {
    setReviewing(null);
    setActionError(undefined);
  };

  return (
    <Panel
      title={canReview ? "Time corrections" : "My correction requests"}
      className="flex-1"
      filters={
        <>
          <div className="mb-3 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
            {canReview ? <SearchInput value={query} onChange={setQuery} label="Employee" showLabel placeholder="Search by name" /> : null}
            <Select
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[...correctionStatuses.map((s) => ({ value: s, label: s })), { value: "All", label: "All requests" }]}
            />
          </div>
          <p className="text-muted">
            {status === "Pending" ? `${pending} waiting for review` : `Showing ${visible.length} request${visible.length === 1 ? "" : "s"}`}
            {canReview ? "" : ". Request corrections from the timecard in the mobile app."}
          </p>
        </>
      }
    >
      {notice ? (
        <div className="mb-3">
          <Alert tone="success" title={notice} />
        </div>
      ) : null}
      {loadError ? (
        <Alert tone="error" title={`Couldn't load corrections: ${loadError}`} />
      ) : loading ? (
        <p className="text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          area="hr"
          title={!canReview ? "No correction requests" : status === "Pending" ? "Nothing waiting for review" : "No matching requests"}
          body={
            !canReview
              ? "Requests you send from your timecard in the mobile app show up here with their status."
              : status === "Pending"
                ? "New correction requests from your team show up here."
                : "Try a different status or name."
          }
        />
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-muted">
              {canReview ? <th className={`py-2 font-bold ${stickyHeadCell}`}>Employee</th> : null}
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Day</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Recorded</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Requested</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Reason</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Status</th>
              <th className={`py-2 ${stickyHeadCell}`} />
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id} className="border-t border-line align-top">
                {canReview ? <td className="py-3 pr-4 font-medium">{c.memberName}</td> : null}
                <td className="whitespace-nowrap py-3 pr-4">{formatDay(c.clockIn)}</td>
                <td className="whitespace-nowrap py-3 pr-4 text-muted">
                  {/* Approving rewrites the punch, so afterwards it would only echo the request. */}
                  {c.status === "Approved"
                    ? "Updated to requested"
                    : c.punchClockIn
                      ? formatSpan(c.punchClockIn, c.punchClockOut)
                      : "Missing entry"}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 font-bold">{formatSpan(c.clockIn, c.clockOut)}</td>
                <td className="max-w-xs py-3 pr-4">
                  <span className="line-clamp-2">{c.reason}</span>
                  {c.adjustment ? <span className="text-sm text-muted">Closed period, posts as an adjustment</span> : null}
                </td>
                <td className="py-3 pr-4">
                  <CorrectionStatusLabel status={c.status} />
                </td>
                <td className="py-3 text-right">
                  {canReview && c.status === "Pending" ? (
                    <Button variant="secondary" onClick={() => setReviewing(c)}>
                      Review
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {reviewing ? (
        <ReviewDialog
          key={reviewing.id}
          correction={reviewing}
          busy={busy}
          error={actionError}
          onApprove={() => void review(reviewing, "approve")}
          onReject={() => void review(reviewing, "reject")}
          onClose={close}
        />
      ) : null}
    </Panel>
  );
}
