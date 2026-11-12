package domain

import "errors"

// Sentinel errors returned by the domain and application layers.
var (
	ErrNotFound          = errors.New("member not found")
	ErrDuplicateEmail    = errors.New("a member with this email already exists")
	ErrForbidden         = errors.New("not allowed for your role")
	ErrInviteExpired     = errors.New("invitation has expired")
	ErrInvalidTransition = errors.New("member is not in a state that allows this")
	ErrOwnerProtected    = errors.New("the owner's role and access can't be changed")
)

// ValidationError reports a caller-supplied field value that failed validation.
type ValidationError struct {
	Field   string
	Message string
}

// Error renders the error as "<field>: <message>".
func (e ValidationError) Error() string {
	return e.Field + ": " + e.Message
}
