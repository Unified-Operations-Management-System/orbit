-- Demo company for develop (mirrors infra.DemoMembers). Invitation times are relative
-- to when the database is created so Casey's invitation is never already expired.

INSERT INTO organizations (id, name, created_at)
VALUES ('org-invex', 'INVEX Foods (demo)', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-30 days'));

INSERT INTO teams (id, org_id, name) VALUES
    ('team-line-1', 'org-invex', 'Production line 1'),
    ('team-line-2', 'org-invex', 'Production line 2');

INSERT INTO members (id, org_id, name, email, role, status, team_id, invited_at, expires_at) VALUES
    ('m-1', 'org-invex', 'Alex Morgan', 'alex@example.com',   'Owner',      'Active',      NULL,          strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+2 days')),
    ('m-2', 'org-invex', 'Jordan Lee',  'jordan@example.com', 'Supervisor', 'Active',      'team-line-1', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+3 days')),
    ('m-3', 'org-invex', 'Sam Patel',   'sam@example.com',    'Employee',   'Active',      'team-line-1', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+4 days')),
    ('m-4', 'org-invex', 'Riley Chen',  'riley@example.com',  'HR Admin',   'Active',      NULL,          strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+5 days')),
    ('m-5', 'org-invex', 'Casey Brown', 'casey@example.com',  'Employee',   'Pending',     'team-line-1', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+6 days')),
    ('m-6', 'org-invex', 'Taylor Kim',  'taylor@example.com', 'Employee',   'Deactivated', 'team-line-2', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),            strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+7 days'));
