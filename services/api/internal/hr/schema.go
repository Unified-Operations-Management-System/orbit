// Package hr is the HR Management area: schedules, time and attendance, pay periods
// and time corrections. Its layers live in domain/, app/ and infra/; this file hands
// the area's SQL to the shared database.
package hr

import (
	"embed"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
)

//go:embed migrations seed
var files embed.FS

// Schema is HR's migrations and seed data, applied by internal/db on start.
var Schema = db.Source{Area: "hr", Files: files}
