package domain

// Action is an operation a member may attempt.
type Action string

// The actions covered by the OAM policy. Listing members is open to every role
// (scope limits what they see); viewing the audit history is fixed to the Owner and
// HR Admin; everything else is a row of the editable Matrix (see permissions.go).
const (
	ActionListMembers Action = "members.list"
	ActionViewAudit   Action = "audit.view"

	ActionInviteMember     = ActionManageMembers
	ActionApproveMember    = ActionManageMembers
	ActionDeactivateMember = ActionManageMembers
)

// Scope is how much of the company a role can see (BR-OAM-R09).
type Scope string

// The three record scopes.
const (
	ScopeCompany Scope = "company"
	ScopeTeam    Scope = "team"
	ScopeSelf    Scope = "self"
)

// ScopeOf returns the record scope of role: the Owner and HR Admin see the
// whole company, a Supervisor sees their own team, an Employee sees only
// themselves.
func ScopeOf(role Role) Scope {
	switch role {
	case RoleOwner, RoleHRAdmin:
		return ScopeCompany
	case RoleSupervisor:
		return ScopeTeam
	default:
		return ScopeSelf
	}
}

// CanSee reports whether a viewer (their role, member ID and team) may see m.
// A supervisor without a team sees only themselves.
func CanSee(role Role, viewer MemberID, team TeamID, m Member) bool {
	switch ScopeOf(role) {
	case ScopeCompany:
		return true
	case ScopeTeam:
		return m.ID == viewer || (team != "" && m.TeamID == team)
	default:
		return m.ID == viewer
	}
}

// Can checks role against the default matrix. Use Matrix.Can when the company has
// edited its permissions.
func Can(role Role, a Action) error {
	return DefaultMatrix().Can(role, a)
}
