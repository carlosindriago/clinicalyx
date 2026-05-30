package ports

// PasswordHasher define el puerto de salida para el hasheo y verificación de contraseñas de usuarios.
type PasswordHasher interface {
	Hash(password string) (string, error)
	Verify(password, hash string) (bool, error)
}
