-- Organization and Access Management: companies, teams, members, the editable
-- permission matrix and the audit log (BR-OAM-R01, R05, R09, R10).
-- Times are UTC RFC 3339 text, e.g. 2026-11-11T17:00:00Z.

CREATE TABLE organizations (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE teams (
    id     TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations (id),
    name   TEXT NOT NULL
);

CREATE TABLE members (
    id         TEXT PRIMARY KEY,
    org_id     TEXT NOT NULL REFERENCES organizations (id),
    name       TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    email      TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('Owner', 'Supervisor', 'Employee', 'HR Admin')),
    status     TEXT NOT NULL CHECK (status IN ('Pending', 'Active', 'Deactivated')),
    team_id    TEXT REFERENCES teams (id),
    invited_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    UNIQUE (org_id, email)                           -- BR-OAM-R05: one membership per email
);
CREATE UNIQUE INDEX members_one_owner ON members (org_id) WHERE role = 'Owner';  -- BR-OAM-R01
CREATE INDEX members_by_org ON members (org_id, invited_at);

-- Who may do what, per company. Rows present = allowed (editable roles matrix).
CREATE TABLE oam_role_permissions (
    org_id TEXT NOT NULL REFERENCES organizations (id),
    action TEXT NOT NULL,
    role   TEXT NOT NULL CHECK (role IN ('Owner', 'Supervisor', 'Employee', 'HR Admin')),
    PRIMARY KEY (org_id, action, role)
);

-- BR-OAM-R10: every change to membership, roles, settings or devices.
CREATE TABLE oam_audit_entries (
    id       TEXT PRIMARY KEY,
    org_id   TEXT NOT NULL REFERENCES organizations (id),
    at       TEXT NOT NULL,
    actor_id TEXT REFERENCES members (id),
    action   TEXT NOT NULL,
    summary  TEXT NOT NULL
);
CREATE INDEX oam_audit_by_org ON oam_audit_entries (org_id, at);
