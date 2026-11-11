package domain

// Action is an operation a member may attempt.
type Action string

// The actions covered by the OAM policy.
const (
	ActionListMembers      Action = "members.list"
	ActionInviteMember     Action = "members.invite"
	ActionApproveMember    Action = "members.approve"
	ActionDeactivateMember Action = "members.deactivate"
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

// Can reports whether role may perform a, returning ErrForbidden if not. Every
// role may list members; only the Owner and HR Admin may invite, approve or
// deactivate.
func Can(role Role, a Action) error {
	switch a {
	case ActionListMembers:
		switch role {
		case RoleOwner, RoleSupervisor, RoleEmployee, RoleHRAdmin:
			return nil
		}
	case ActionInviteMember, ActionApproveMember, ActionDeactivateMember:
		if role == RoleOwner || role == RoleHRAdmin {
			return nil
		}
	}
	return ErrForbidden
}
