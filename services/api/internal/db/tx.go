package db

import (
	"context"
	"database/sql"
	"fmt"
)

// Querier is what repositories run SQL on: the open transaction if there is one,
// otherwise the database.
type Querier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

type txKey struct{}

// Q returns the transaction started by RunInTx for this context, or conn itself.
// Repositories call Q(ctx, r.db) for every query so a use case can wrap several
// repository calls (e.g. a member change and its audit entry) in one transaction.
func Q(ctx context.Context, conn *sql.DB) Querier {
	if tx, ok := ctx.Value(txKey{}).(*sql.Tx); ok {
		return tx
	}
	return conn
}

// RunInTx runs fn in a transaction: commit if it returns nil, roll back otherwise.
// Nested calls join the outer transaction.
func RunInTx(ctx context.Context, conn *sql.DB, fn func(ctx context.Context) error) error {
	if _, ok := ctx.Value(txKey{}).(*sql.Tx); ok {
		return fn(ctx)
	}
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	if err := fn(context.WithValue(ctx, txKey{}, tx)); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
