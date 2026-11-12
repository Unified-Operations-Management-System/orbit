package domain

import (
	"context"
	"slices"
)

// Rows of the editable roles matrix (Organization → Roles and permissions).
const (
	ActionEditCompany      Action = "company.edit"
	ActionManageMembers    Action = "members.manage" // invite, approve, deactivate
	ActionAssignRoles      Action = "roles.assign"
	ActionPublishSchedules Action = "schedules.publish"
	ActionApproveTimecards Action = "timecards.approve"
	ActionViewCosts        Action = "costs.view"
	ActionClockIn          Action = "shift.clock"
)

// MatrixActions is every editable action, in display order.
var MatrixActions = []Action{
	ActionEditCompany, ActionManageMembers, ActionAssignRoles, ActionPublishSchedules,
	ActionApproveTimecards, ActionViewCosts, ActionClockIn,
}

// OwnerLocked actions always include the Owner so nobody locks the company out of
// its own settings (BR-OAM-R03).
var OwnerLocked = []Action{ActionEditCompany, ActionAssignRoles}

// Matrix says which roles may perform each action.
type Matrix map[Action][]Role

// DefaultMatrix is what a company starts with until the owner edits it.
func DefaultMatrix() Matrix {
	return Matrix{
		ActionEditCompany:      {RoleOwner},
		ActionManageMembers:    {RoleOwner, RoleHRAdmin},
		ActionAssignRoles:      {RoleOwner},
		ActionPublishSchedules: {RoleOwner, RoleSupervisor},
		ActionApproveTimecards: {RoleSupervisor, RoleHRAdmin},
		ActionViewCosts:        {RoleOwner},
		ActionClockIn:          {RoleOwner, RoleSupervisor, RoleEmployee, RoleHRAdmin},
	}
}

// Can returns nil if role may perform a, else ErrForbidden.
func (m Matrix) Can(role Role, a Action) error {
	switch a {
	case ActionListMembers:
		return nil
	case ActionViewAudit:
		if role == RoleOwner || role == RoleHRAdmin {
			return nil
		}
		return ErrForbidden
	}
	if slices.Contains(m[a], role) {
		return nil
	}
	return ErrForbidden
}

// Validate checks an edited matrix: only known actions and roles, every action
// present, and the owner-locked actions still include the Owner.
func (m Matrix) Validate() error {
	for a, roles := range m {
		if !slices.Contains(MatrixActions, a) {
			return ValidationError{Field: "action", Message: "unknown action " + string(a)}
		}
		for _, r := range roles {
			if _, err := ParseRole(string(r)); err != nil {
				return err
			}
		}
	}
	for _, a := range MatrixActions {
		if _, ok := m[a]; !ok {
			return ValidationError{Field: "action", Message: "missing action " + string(a)}
		}
	}
	for _, a := range OwnerLocked {
		if !slices.Contains(m[a], RoleOwner) {
			return ValidationError{Field: "allowed", Message: "the owner always keeps " + string(a)}
		}
	}
	return nil
}

// PermissionRepository stores each company's matrix. Get returns DefaultMatrix for a
// company that has never edited it.
type PermissionRepository interface {
	Get(ctx context.Context, org OrgID) (Matrix, error)
	Put(ctx context.Context, org OrgID, m Matrix) error
}
