"use client";

import { useState } from "react";
import { Alert, Button, Card, Checkbox, Input, Select } from "@/components/ui";
import {
  company,
  inviteExpiryOptions,
  orgSettings,
  payPeriodOptions,
  timezoneOptions,
  weekStartOptions,
} from "../company-data";

const labelClass = "shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-muted";

export function CompanyView() {
  const [profile, setProfile] = useState({ ...company });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...company });
  const [nameError, setNameError] = useState<string>();
  const [profileSaved, setProfileSaved] = useState(false);

  const [settings, setSettings] = useState({ ...orgSettings });
  const [shiftError, setShiftError] = useState<string>();
  const [settingsSaved, setSettingsSaved] = useState(false);

  const startEdit = () => {
    setDraft({ ...profile });
    setNameError(undefined);
    setEditing(true);
  };

  const saveProfile = () => {
    if (!draft.name.trim()) return setNameError("Company name is required.");
    setProfile(draft);
    setNameError(undefined);
    setEditing(false);
    setProfileSaved(true);
  };

  const saveSettings = () => {
    const hours = Number(settings.shiftLengthHours);
    if (!Number.isFinite(hours) || hours < 4 || hours > 12) {
      return setShiftError("Shift length must be between 4 and 12 hours.");
    }
    setShiftError(undefined);
    setSettingsSaved(true);
  };

  return (
    <section aria-label="Company setup" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {profileSaved ? <Alert tone="success" title="Company profile saved." /> : null}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-bold">Company profile</h2>
            {editing ? null : <Button variant="secondary" onClick={startEdit}>Edit</Button>}
          </div>
          {editing ? (
            <div className="flex flex-col gap-4">
              <Input
                label="Company name"
                value={draft.name}
                error={nameError}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              <Input
                label="Legal name"
                value={draft.legalName}
                onChange={(e) => setDraft({ ...draft, legalName: e.target.value })}
              />
              <Input
                label="Phone"
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
              <Input
                label="Address"
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              />
              <Select
                label="Time zone"
                value={draft.timezone}
                options={timezoneOptions}
                onChange={(v) => setDraft({ ...draft, timezone: v })}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setEditing(false); setNameError(undefined); }}>
                  Cancel
                </Button>
                <Button onClick={saveProfile}>Save changes</Button>
              </div>
            </div>
          ) : (
            <dl className="divide-y divide-line">
              <div className="flex items-baseline gap-4 py-3 first:pt-0">
                <dt className={labelClass}>Name</dt>
                <dd>{profile.name}</dd>
              </div>
              <div className="flex items-baseline gap-4 py-3">
                <dt className={labelClass}>Legal name</dt>
                <dd>{profile.legalName}</dd>
              </div>
              <div className="flex items-baseline gap-4 py-3">
                <dt className={labelClass}>Industry</dt>
                <dd>{profile.industry}</dd>
              </div>
              <div className="flex items-baseline gap-4 py-3">
                <dt className={labelClass}>Address</dt>
                <dd>{profile.address}</dd>
              </div>
              <div className="flex items-baseline gap-4 py-3">
                <dt className={labelClass}>Phone</dt>
                <dd>{profile.phone}</dd>
              </div>
              <div className="flex items-baseline gap-4 pt-3">
                <dt className={labelClass}>Time zone</dt>
                <dd>{profile.timezone}</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        {settingsSaved ? <Alert tone="success" title="Settings saved." /> : null}
        <Card>
          <h2 className="mb-4 text-[22px] font-bold">Organization settings</h2>
          <div className="flex flex-col gap-4">
            <Select
              label="Pay period"
              value={settings.payPeriod}
              options={payPeriodOptions}
              onChange={(v) => setSettings({ ...settings, payPeriod: v })}
            />
            <Select
              label="Week starts on"
              value={settings.weekStart}
              options={weekStartOptions}
              onChange={(v) => setSettings({ ...settings, weekStart: v })}
            />
            <Select
              label="Invitation expiry"
              value={settings.inviteExpiryDays}
              options={inviteExpiryOptions}
              onChange={(v) => setSettings({ ...settings, inviteExpiryDays: v })}
            />
            <Input
              label="Shift length (hours)"
              type="number"
              min={4}
              max={12}
              value={settings.shiftLengthHours}
              error={shiftError}
              onChange={(e) => setSettings({ ...settings, shiftLengthHours: e.target.value })}
            />
            <Checkbox
              label="Require owner approval for new members"
              description="New members can't see any records until approved."
              checked={settings.requireApproval}
              onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
            />
            <div className="flex justify-end">
              <Button onClick={saveSettings}>Save settings</Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
