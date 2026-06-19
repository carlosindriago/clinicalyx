package http

import (
	"encoding/json"
	"errors"
	"net/http"
)

// DefaultMaxRequestBodyBytes es el límite por defecto para el tamaño del
// body de las requests JSON. Es suficientemente grande para los payloads
// clínicos más pesados (consultas con metadatos, pacientes con todos los
// campos) y suficientemente pequeño para mitigar DoS por bodies enormes.
//
// Aprox. 2 MiB. Los uploads de archivos médicos NO pasan por el proxy
// JSON del frontend (van por presigned URL a S3/MinIO), por lo que 2 MiB
// es holgado para la API clínica.
const DefaultMaxRequestBodyBytes int64 = 2 * 1024 * 1024

// MaxBytesMiddleware limita el tamaño del body de TODA request que pase
// por el router. Lo aplica sobre r.Body, devolviendo 413 Request Entity
// Too Large si el cliente envía más bytes de los permitidos.
//
// Defense-in-depth contra ataques de denegación de servicio donde un
// cliente malicioso envía un body JSON enorme (e.g. 1 GB) consumiendo
// memoria antes de que el timeout del request dispare. Sin esta capa,
// múltiples requests concurrentes con bodies grandes pueden agotar la
// RAM del proceso.
//
// Implementación: usa http.MaxBytesReader de la stdlib, que:
//   - Devuelve un ReadCloser que aborta lecturas que excedan el límite
//     con un error de tipo *http.MaxBytesError.
//   - Cierra la conexión subyacente cuando se excede el límite, evitando
//     que el cliente continúe enviando bytes.
//   - El mensaje de error es estable ("http: request body too large").
//
// Fuente: documentación oficial de net/http en golang.org (Context7).
func MaxBytesMiddleware(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Envolver el body ANTES de que cualquier handler lo lea.
			// Importante: sustituimos r.Body por el reader limitado,
			// pero conservamos la interfaz http.Request. Las llamadas
			// a r.Body.Close() se delegan correctamente.
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// decodeJSONBody decodifica el body de r en target, devolviendo un error
// tipado si el body excede el límite de MaxBytesReader. El handler
// puede entonces devolver 413 en lugar de 400.
//
// Separar esta función del middleware permite a los handlers distinguir
// entre JSON malformado (400) y body demasiado grande (413), que son
// errores operacionalmente distintos.
func decodeJSONBody(r *http.Request, target interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			return ErrRequestBodyTooLarge
		}
		return err
	}
	return nil
}

// ErrRequestBodyTooLarge se devuelve cuando el body excede el límite
// configurado en MaxBytesMiddleware. El handler debe responder 413.
var ErrRequestBodyTooLarge = errors.New("request body too large")
