package app

import (
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	hrschema "github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr"
	oamschema "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam"
)

// Areas lists every functional area's database schema. Adding your area is one line:
// expose `var Schema = db.Source{…}` from internal/<area>/schema.go and add it here.
// Order doesn't matter: migrations run in file-name (timestamp) order across all areas.
var Areas = []db.Source{
	oamschema.Schema,
	hrschema.Schema,
}
