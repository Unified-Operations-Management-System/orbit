-- HR demo data for develop. Builds on OAM's demo company (org-invex):
--   m-2 Jordan Lee (Supervisor, team-line-1), m-3 Sam Patel (Employee, team-line-1),
--   m-4 Riley Chen (HR Admin). Sign in as dev:employee to see Sam's schedule and timecard.
--
-- Everything is relative to when the database is created: "day 0" is the Monday of the
-- current week, and shifts run 7:00 AM - 3:00 PM Toronto time (12:00Z - 20:00Z in winter).
-- Punches are only created for days before today, so today's clock-in is free to demo.

INSERT INTO hr_settings (org_id, timezone, clock_in_window_min, overtime_weekly_hours, max_shift_hours)
VALUES ('org-invex', 'America/Toronto', 15, 40, 12);

-- Pay periods: two weeks each, from local midnight (05:00Z). Last period is closed (paid);
-- the current one started last Monday; a few future ones are open so the demo keeps working.
WITH base(d) AS (SELECT date('now', '-6 days', 'weekday 1')),
v(id, start_day, status) AS (VALUES
    ('pp-prev',   -21, 'Closed'),
    ('pp-now',     -7, 'Open'),
    ('pp-next-1',   7, 'Open'),
    ('pp-next-2',  21, 'Open'),
    ('pp-next-3',  35, 'Open'),
    ('pp-next-4',  49, 'Open'))
INSERT INTO hr_pay_periods (id, org_id, starts_at, ends_at, pay_date, status)
SELECT v.id, 'org-invex',
       strftime('%Y-%m-%dT05:00:00Z', base.d, printf('%+d days', v.start_day)),
       strftime('%Y-%m-%dT05:00:00Z', base.d, printf('%+d days', v.start_day + 14)),
       date(base.d, printf('%+d days', v.start_day + 18)),
       v.status
FROM v, base;

-- Shifts. day = offset from this Monday; start/end = minutes after 00:00Z.
WITH base(d) AS (SELECT date('now', '-6 days', 'weekday 1')),
v(id, member_id, day, start_min, end_min, station, notes, change_note, published) AS (VALUES
    -- Two weeks ago (closed pay period)
    ('sh-sam-w-2-fri', 'm-3', -10, 720, 1200, 'Packing Line 2', '', NULL, 1),
    -- Last week
    ('sh-sam-w-1-mon', 'm-3', -7, 720, 1200, 'Packing Line 2', '', NULL, 1),
    ('sh-sam-w-1-tue', 'm-3', -6, 720, 1200, 'Packing Line 2', '', NULL, 1),
    ('sh-sam-w-1-wed', 'm-3', -5, 720, 1200, 'Mixing Line 1', '', NULL, 1),
    ('sh-sam-w-1-thu', 'm-3', -4, 720, 1200, 'Packing Line 2', '', NULL, 1),
    ('sh-sam-w-1-fri', 'm-3', -3, 720, 1200, 'Packing Line 2', '', NULL, 1),
    -- This week
    ('sh-sam-w0-mon', 'm-3', 0, 720, 1200, 'Packing Line 2', '', NULL, 1),
    ('sh-sam-w0-tue', 'm-3', 1, 720, 1200, 'Packing Line 2', '', NULL, 1),
    ('sh-sam-w0-wed', 'm-3', 2, 720, 1200, 'Mixing Line 1', 'Covering for a teammate on Mixing.', NULL, 1),
    ('sh-sam-w0-thu', 'm-3', 3, 720, 1200, 'Packing Line 2', '', NULL, 1),
    ('sh-sam-w0-fri', 'm-3', 4, 720, 1200, 'Packing Line 2', 'Allergen changeover at noon. Wear a fresh hairnet after lunch.', NULL, 1),
    -- Next week (Wednesday is approved vacation, see hr_time_off)
    ('sh-sam-w1-mon', 'm-3', 7, 960, 1440, 'Packing Line 2', '', 'Moved from 7:00 AM to 11:00 AM', 1),
    ('sh-sam-w1-tue', 'm-3', 8, 960, 1440, 'Packing Line 2', '', NULL, 1),
    ('sh-sam-w1-thu', 'm-3', 10, 720, 1200, 'Shipping Dock', 'Forklift-certified staff only on the dock.', 'Station changed from Packing Line 2', 1),
    ('sh-sam-w1-fri', 'm-3', 11, 720, 1200, 'Packing Line 2', '', NULL, 1),
    -- The week after: still a draft, so Sam can't see it yet
    ('sh-sam-w2-mon', 'm-3', 14, 720, 1200, 'Packing Line 2', '', NULL, 0),
    -- Jordan (supervisor) this week, 6:30 AM - 2:30 PM
    ('sh-jor-w0-mon', 'm-2', 0, 690, 1170, 'Line 1 floor', '', NULL, 1),
    ('sh-jor-w0-tue', 'm-2', 1, 690, 1170, 'Line 1 floor', '', NULL, 1),
    ('sh-jor-w0-wed', 'm-2', 2, 690, 1170, 'Line 1 floor', '', NULL, 1),
    ('sh-jor-w0-thu', 'm-2', 3, 690, 1170, 'Line 1 floor', '', NULL, 1),
    ('sh-jor-w0-fri', 'm-2', 4, 690, 1170, 'Line 1 floor', '', NULL, 1))
INSERT INTO hr_shifts (id, org_id, member_id, team_id, starts_at, ends_at, station, notes, published_at, change_note, updated_at)
SELECT v.id, 'org-invex', v.member_id, 'team-line-1',
       strftime('%Y-%m-%dT%H:%M:%SZ', base.d, printf('%+d days', v.day), printf('+%d minutes', v.start_min)),
       strftime('%Y-%m-%dT%H:%M:%SZ', base.d, printf('%+d days', v.day), printf('+%d minutes', v.end_min)),
       v.station, v.notes,
       CASE WHEN v.published = 1 THEN strftime('%Y-%m-%dT%H:%M:%SZ', base.d, printf('%+d days', v.day - 10)) END,
       v.change_note,
       strftime('%Y-%m-%dT%H:%M:%SZ', base.d, printf('%+d days', v.day - 10))
FROM v, base;

-- Sam's vacation day next Wednesday (whole local day).
INSERT INTO hr_time_off (id, org_id, member_id, starts_at, ends_at, kind, status, note)
SELECT 'to-sam-w1-wed', 'org-invex', 'm-3',
       strftime('%Y-%m-%dT05:00:00Z', d, '+9 days'), strftime('%Y-%m-%dT05:00:00Z', d, '+10 days'),
       'Vacation', 'Approved', 'Approved vacation day.'
FROM (SELECT date('now', '-6 days', 'weekday 1') AS d);

-- Punches, only for days before today. Last Wednesday has no punch at all (a missed shift),
-- last Thursday was split around a late lunch, last Friday was late.
WITH base(d) AS (SELECT date('now', '-6 days', 'weekday 1')),
v(id, member_id, shift_id, day, in_min, out_min, late) AS (VALUES
    ('te-sam-w-2-fri', 'm-3', 'sh-sam-w-2-fri', -10, 720, 1200, 0),
    ('te-sam-w-1-mon', 'm-3', 'sh-sam-w-1-mon', -7, 718, 1202, 0),
    ('te-sam-w-1-tue', 'm-3', 'sh-sam-w-1-tue', -6, 721, 1199, 0),
    ('te-sam-w-1-thu-a', 'm-3', 'sh-sam-w-1-thu', -4, 720, 960, 0),
    ('te-sam-w-1-thu-b', 'm-3', 'sh-sam-w-1-thu', -4, 990, 1200, 0),
    ('te-sam-w-1-fri', 'm-3', 'sh-sam-w-1-fri', -3, 732, 1200, 1),
    ('te-sam-w0-mon', 'm-3', 'sh-sam-w0-mon', 0, 717, 1203, 0),
    ('te-sam-w0-tue', 'm-3', 'sh-sam-w0-tue', 1, 718, 1200, 0),
    ('te-sam-w0-wed', 'm-3', 'sh-sam-w0-wed', 2, 725, 1201, 1),
    ('te-sam-w0-thu', 'm-3', 'sh-sam-w0-thu', 3, 719, 1200, 0),
    ('te-jor-w0-mon', 'm-2', 'sh-jor-w0-mon', 0, 688, 1172, 0),
    ('te-jor-w0-tue', 'm-2', 'sh-jor-w0-tue', 1, 689, 1170, 0),
    ('te-jor-w0-wed', 'm-2', 'sh-jor-w0-wed', 2, 690, 1171, 0),
    ('te-jor-w0-thu', 'm-2', 'sh-jor-w0-thu', 3, 687, 1170, 0))
INSERT INTO hr_time_entries (id, org_id, member_id, shift_id, clock_in, clock_out, late, source)
SELECT v.id, 'org-invex', v.member_id, v.shift_id,
       strftime('%Y-%m-%dT%H:%M:%SZ', base.d, printf('%+d days', v.day), printf('+%d minutes', v.in_min)),
       strftime('%Y-%m-%dT%H:%M:%SZ', base.d, printf('%+d days', v.day), printf('+%d minutes', v.out_min)),
       v.late, 'Clock'
FROM v, base
WHERE date(base.d, printf('%+d days', v.day)) < date('now');

-- A pending correction for last Friday's late punch, waiting on Jordan (Sam's supervisor).
INSERT INTO hr_time_corrections (id, org_id, member_id, time_entry_id, shift_id, clock_in, clock_out, reason,
                                 status, adjustment, assigned_to_id, submitted_at)
SELECT 'tc-sam-w-1-fri', 'org-invex', 'm-3', 'te-sam-w-1-fri', 'sh-sam-w-1-fri',
       strftime('%Y-%m-%dT12:00:00Z', d, '-3 days'), strftime('%Y-%m-%dT20:00:00Z', d, '-3 days'),
       'Badge reader at the door was down, I started at 7:00.', 'Pending', 0, 'm-2',
       strftime('%Y-%m-%dT21:00:00Z', d, '-3 days')
FROM (SELECT date('now', '-6 days', 'weekday 1') AS d);
