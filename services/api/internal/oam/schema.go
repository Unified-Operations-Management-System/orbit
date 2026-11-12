// Package oam is the Organization and Access Management area. Its layers live in
// domain/, app/ and infra/; this file hands the area's SQL to the shared database.
package oam

import (
	"embed"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
)

//go:embed migrations seed
var files embed.FS

// Schema is OAM's migrations and seed data, applied by internal/db on start.
var Schema = db.Source{Area: "oam", Files: files}
