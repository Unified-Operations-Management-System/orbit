// Package domain models the OAM (Organization Access Management) domain:
// memberships, roles, statuses, the policy that governs who may act, and the
// repository contract used to persist members.
package domain

import (
	"strings"
	"time"
	"unicode/utf8"
)

// MemberID identifies a member.
type MemberID string

// OrgID identifies an organization.
type OrgID string

// TeamID identifies a team: a group of employees led by a supervisor on a shift
// or line.
type TeamID string

// Role is the part a member plays inside an organization.
type Role string

// The four roles a member may hold.
const (
	RoleOwner      Role = "Owner"
	RoleSupervisor Role = "Supervisor"
	RoleEmployee   Role = "Employee"
	RoleHRAdmin    Role = "HR Admin"
)

// ParseRole returns the Role whose value equals s exactly.
func ParseRole(s string) (Role, error) {
	switch Role(s) {
	case RoleOwner, RoleSupervisor, RoleEmployee, RoleHRAdmin:
		return Role(s), nil
	}
	return "", ValidationError{Field: "role", Message: "is not a known role"}
}

// Status is the lifecycle state of a membership.
type Status string

// The three membership states.
const (
	StatusPending     Status = "Pending"
	StatusActive      Status = "Active"
	StatusDeactivated Status = "Deactivated"
)

// Email is a normalised email address.
type Email string

// ParseEmail trims and lower-cases s, then validates the result as an email
// address: at most 254 characters, exactly one "@", a non-empty local part and
// a domain containing a dot.
func ParseEmail(s string) (Email, error) {
	e := strings.ToLower(strings.TrimSpace(s))
	invalid := ValidationError{Field: "email", Message: "is not a valid email address"}
	if e == "" || len(e) > 254 {
		return "", invalid
	}
	local, domainPart, ok := strings.Cut(e, "@")
	if !ok || local == "" || strings.Contains(domainPart, "@") || !strings.Contains(domainPart, ".") {
		return "", invalid
	}
	return Email(e), nil
}

// InviteTTL is how long an invitation remains valid (BR-OAM-R07).
const InviteTTL = 7 * 24 * time.Hour

// Member is the aggregate for one person's membership in one organization.
type Member struct {
	ID     MemberID
	OrgID  OrgID
	Name   string
	Email  Email
	Role   Role
	Status Status
	// TeamID is the team the member belongs to; for a supervisor, the team they
	// lead. Empty means no team.
	TeamID    TeamID
	InvitedAt time.Time
	ExpiresAt time.Time
}

// NewInvitedMember validates an invitation and returns it as a Pending member.
// The name is trimmed and must be 1..100 characters. Inviting someone as Owner
// is not allowed. The invitation expires InviteTTL after now.
func NewInvitedMember(id MemberID, org OrgID, name string, email Email, role Role, now time.Time) (Member, error) {
	name = strings.TrimSpace(name)
	if n := utf8.RuneCountInString(name); n < 1 || n > 100 {
		return Member{}, ValidationError{Field: "name", Message: "must be between 1 and 100 characters"}
	}
	if role == RoleOwner {
		return Member{}, ValidationError{Field: "role", Message: "cannot invite an owner"}
	}
	return Member{
		ID:        id,
		OrgID:     org,
		Name:      name,
		Email:     email,
		Role:      role,
		Status:    StatusPending,
		InvitedAt: now,
		ExpiresAt: now.Add(InviteTTL),
	}, nil
}

// Approve moves a Pending member to Active. An invitation whose ExpiresAt has
// passed yields ErrInviteExpired; any other status yields ErrInvalidTransition.
func (m *Member) Approve(now time.Time) error {
	if m.Status != StatusPending {
		return ErrInvalidTransition
	}
	if now.After(m.ExpiresAt) {
		return ErrInviteExpired
	}
	m.Status = StatusActive
	return nil
}

// Deactivate moves a Pending or Active member to Deactivated. The Owner is
// protected and an already deactivated member is an invalid transition.
func (m *Member) Deactivate() error {
	if m.Role == RoleOwner {
		return ErrOwnerProtected
	}
	switch m.Status {
	case StatusPending, StatusActive:
		m.Status = StatusDeactivated
		return nil
	default:
		return ErrInvalidTransition
	}
}
