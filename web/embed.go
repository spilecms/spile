package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// DistFS returns a filesystem subrooted at dist
func DistFS() (fs.FS, error) {
	return fs.Sub(distFS, "dist")
}
