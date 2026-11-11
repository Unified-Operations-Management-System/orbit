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
