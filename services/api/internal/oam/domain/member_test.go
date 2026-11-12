package domain_test

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

func assertValidationField(t *testing.T, err error, field string) {
	t.Helper()
	var ve domain.ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("want ValidationError, got %v", err)
	}
	if ve.Field != field {
		t.Fatalf("field = %q, want %q", ve.Field, field)
	}
}

func mustInvited(t *testing.T, role domain.Role) domain.Member {
	t.Helper()
	m, err := domain.NewInvitedMember("m-1", "org-1", "Casey Brown", "casey@example.com", role, testNow())
	if err != nil {
		t.Fatalf("NewInvitedMember: %v", err)
	}
	return m
}

func testNow() time.Time {
	return time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
}

func TestParseEmail(t *testing.T) {
	valid := []struct{ in, want string }{
		{"alex@example.com", "alex@example.com"},
		{"  Alex@Example.COM  ", "alex@example.com"},
		{"a@b.c", "a@b.c"},
	}
	for _, tc := range valid {
		got, err := domain.ParseEmail(tc.in)
		if err != nil {
			t.Errorf("ParseEmail(%q) returned error: %v", tc.in, err)
			continue
		}
		if string(got) != tc.want {
			t.Errorf("ParseEmail(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}

	invalid := []string{
		"",
		"   ",
		"no-at-sign",
		"@example.com",
		"alex@",
		"alex@example",
		"alex@@example.com",
		"alex@example@com",
		strings.Repeat("a", 250) + "@example.com",
	}
	for _, in := range invalid {
		_, err := domain.ParseEmail(in)
		if err == nil {
			t.Errorf("ParseEmail(%q) succeeded, want error", in)
			continue
		}
		assertValidationField(t, err, "email")
	}
}

func TestParseRole(t *testing.T) {
	for _, want := range []domain.Role{domain.RoleOwner, domain.RoleSupervisor, domain.RoleEmployee, domain.RoleHRAdmin} {
		got, err := domain.ParseRole(string(want))
		if err != nil {
			t.Errorf("ParseRole(%q) returned error: %v", want, err)
			continue
		}
		if got != want {
			t.Errorf("ParseRole(%q) = %q, want %q", want, got, want)
		}
	}
	for _, in := range []string{"", "owner", "Admin", "HRAdmin", "HR admin", " Owner"} {
		if _, err := domain.ParseRole(in); err == nil {
			t.Errorf("ParseRole(%q) succeeded, want error", in)
		} else {
			assertValidationField(t, err, "role")
		}
	}
}

func TestNewInvitedMember(t *testing.T) {
	now := testNow()

	t.Run("ok", func(t *testing.T) {
		m, err := domain.NewInvitedMember("m-9", "org-1", "  Casey Brown  ", "casey@example.com", domain.RoleEmployee, now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if m.Name != "Casey Brown" {
			t.Errorf("Name = %q, want %q", m.Name, "Casey Brown")
		}
		if m.Status != domain.StatusPending {
			t.Errorf("Status = %q, want Pending", m.Status)
		}
		if !m.InvitedAt.Equal(now) {
			t.Errorf("InvitedAt = %v, want %v", m.InvitedAt, now)
		}
		if !m.ExpiresAt.Equal(now.Add(domain.InviteTTL)) {
			t.Errorf("ExpiresAt = %v, want %v", m.ExpiresAt, now.Add(domain.InviteTTL))
		}
	})

	t.Run("empty name", func(t *testing.T) {
		_, err := domain.NewInvitedMember("m-9", "org-1", "   ", "casey@example.com", domain.RoleEmployee, now)
		assertValidationField(t, err, "name")
	})

	t.Run("name too long", func(t *testing.T) {
		_, err := domain.NewInvitedMember("m-9", "org-1", strings.Repeat("x", 101), "casey@example.com", domain.RoleEmployee, now)
		assertValidationField(t, err, "name")
	})

	t.Run("owner role", func(t *testing.T) {
		_, err := domain.NewInvitedMember("m-9", "org-1", "Alex Morgan", "alex@example.com", domain.RoleOwner, now)
		if err == nil {
			t.Fatal("expected error")
		}
		var ve domain.ValidationError
		if !errors.As(err, &ve) || ve.Field != "role" || ve.Message != "cannot invite an owner" {
			t.Fatalf("got %v, want role validation error", err)
		}
	})
}

func TestApprove(t *testing.T) {
	now := testNow()

	t.Run("ok", func(t *testing.T) {
		m := mustInvited(t, domain.RoleEmployee)
		if err := m.Approve(now.Add(time.Hour)); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if m.Status != domain.StatusActive {
			t.Fatalf("Status = %q, want Active", m.Status)
		}
	})

	t.Run("at expiry is still valid", func(t *testing.T) {
		m := mustInvited(t, domain.RoleEmployee)
		if err := m.Approve(m.ExpiresAt); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("expired", func(t *testing.T) {
		m := mustInvited(t, domain.RoleEmployee)
		if err := m.Approve(m.ExpiresAt.Add(time.Second)); !errors.Is(err, domain.ErrInviteExpired) {
			t.Fatalf("got %v, want ErrInviteExpired", err)
		}
		if m.Status != domain.StatusPending {
			t.Fatalf("Status = %q, want Pending", m.Status)
		}
	})

	t.Run("wrong status", func(t *testing.T) {
		m := mustInvited(t, domain.RoleEmployee)
		if err := m.Approve(now); err != nil {
			t.Fatalf("first approve: %v", err)
		}
		if err := m.Approve(now); !errors.Is(err, domain.ErrInvalidTransition) {
			t.Fatalf("got %v, want ErrInvalidTransition", err)
		}
	})
}

func TestDeactivate(t *testing.T) {
	now := testNow()

	tests := []struct {
		name    string
		member  func(t *testing.T) domain.Member
		wantErr error
	}{
		{
			name:   "from pending",
			member: func(t *testing.T) domain.Member { return mustInvited(t, domain.RoleEmployee) },
		},
		{
			name: "from active",
			member: func(t *testing.T) domain.Member {
				m := mustInvited(t, domain.RoleEmployee)
				if err := m.Approve(now); err != nil {
					t.Fatalf("Approve: %v", err)
				}
				return m
			},
		},
		{
			name: "owner protected",
			member: func(t *testing.T) domain.Member {
				return domain.Member{ID: "m-1", OrgID: "org-1", Name: "Alex", Email: "alex@example.com", Role: domain.RoleOwner, Status: domain.StatusActive}
			},
			wantErr: domain.ErrOwnerProtected,
		},
		{
			name: "already deactivated",
			member: func(t *testing.T) domain.Member {
				m := mustInvited(t, domain.RoleEmployee)
				if err := m.Deactivate(); err != nil {
					t.Fatalf("Deactivate: %v", err)
				}
				return m
			},
			wantErr: domain.ErrInvalidTransition,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			m := tc.member(t)
			err := m.Deactivate()
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("got %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if m.Status != domain.StatusDeactivated {
				t.Fatalf("Status = %q, want Deactivated", m.Status)
			}
		})
	}
}

func TestChangeRole(t *testing.T) {
	member := func(role domain.Role, status domain.Status) domain.Member {
		return domain.Member{ID: "m", Role: role, Status: status}
	}
	m := member(domain.RoleEmployee, domain.StatusActive)
	if err := m.ChangeRole(domain.RoleSupervisor); err != nil || m.Role != domain.RoleSupervisor {
		t.Fatalf("change: %v %s", err, m.Role)
	}
	var ve domain.ValidationError
	if err := m.ChangeRole(domain.RoleOwner); !errors.As(err, &ve) {
		t.Fatalf("make owner: want ValidationError, got %v", err)
	}
	owner := member(domain.RoleOwner, domain.StatusActive)
	if err := owner.ChangeRole(domain.RoleEmployee); !errors.Is(err, domain.ErrOwnerProtected) {
		t.Fatalf("owner: want ErrOwnerProtected, got %v", err)
	}
	gone := member(domain.RoleEmployee, domain.StatusDeactivated)
	if err := gone.ChangeRole(domain.RoleSupervisor); !errors.Is(err, domain.ErrInvalidTransition) {
		t.Fatalf("deactivated: want ErrInvalidTransition, got %v", err)
	}
}
