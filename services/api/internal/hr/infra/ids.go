package infra

import (
	"crypto/rand"
	"encoding/hex"
)

func randomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic("hr/infra: reading random bytes: " + err.Error())
	}
	return hex.EncodeToString(b)
}
