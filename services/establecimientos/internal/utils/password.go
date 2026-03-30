package utils

import "crypto/rand"

// GenerateSecurePassword genera una contraseña aleatoria de 16 caracteres
// usando un conjunto de caracteres que evita ambigüedades visuales (0/O, 1/l/I).
func GenerateSecurePassword() (string, error) {
	const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*"
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return string(b), nil
}
