package app

import (
	"context"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Mailer delivers invitation emails.
type Mailer interface {
	SendInvite(ctx context.Context, m domain.Member) error
}

// Clock supplies the current time; tests substitute a fake.
type Clock interface {
	Now() time.Time
}

// SystemClock is the production Clock.
type SystemClock struct{}

// Now returns the current time in UTC.
func (SystemClock) Now() time.Time { return time.Now().UTC() }

var _ Clock = SystemClock{}

// TxRunner runs fn so that every repository call inside it commits or rolls back
// together (a member change and its audit entry).
type TxRunner interface {
	WithinTx(ctx context.Context, fn func(ctx context.Context) error) error
}

// NoTx runs fn directly, for in-memory stores in unit tests.
type NoTx struct{}

// WithinTx calls fn.
func (NoTx) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error { return fn(ctx) }
