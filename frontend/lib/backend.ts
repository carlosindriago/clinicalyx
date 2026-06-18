// lib/backend.ts
// Helpers de integración entre el frontend Next.js y el backend Go.
//
// Toda la comunicación frontend → backend DEBE pasar por estas funciones.
// Características de seguridad:
//
// 1. La URL del backend es SIEMPRE leída de BACKEND_API_URL, nunca
//    construida desde headers del request (Host, X-Forwarded-Proto).
//    Esto cierra el vector SSRF donde un atacante que controle Host
//    podría redirigir el fetch a un servidor arbitrario junto con las
//    cookies HttpOnly.
//
// 2. El header X-Tenant-ID NO se reenvía del cliente al backend. El
//    backend es la única fuente de verdad para el tenant: lo extrae del
//    JWT firmado criptográficamente. Si un cliente envía X-Tenant-ID
//    en su request, se IGNORA silenciosamente.
//
// 3. La cookie de sesión SÍ se reenvía (Set-Cookie) para que el backend
//    identifique al usuario. Esto no es spoofing: el cliente no puede
//    alterar el contenido de una cookie httpOnly firmada con JWT.

import type { NextRequest } from "next/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Devuelve la URL base del backend Go. Se lee de la variable de entorno
 * BACKEND_API_URL en tiempo de servidor. NO acepta entrada del cliente.
 *
 * Importante: nunca usar headers del request (Host, X-Forwarded-Proto,
 * Referer) para construir la URL del backend. Eso es SSRF.
 */
export function backendBaseUrl(): string {
  return process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
}

/**
 * Construye los headers que se reenvían al backend desde un proxy o
 * Server Component.
 *
 * Política explícita:
 * - Se reenvía la cookie de sesión tal cual (necesaria para que el
 *   backend identifique al usuario vía JWT).
 * - NO se reenvía X-Tenant-ID del cliente. El backend debe extraer el
 *   tenant del JWT verificado.
 * - Opcionalmente acepta un Content-Type para métodos con body.
 */
export function buildUpstreamHeaders(
  request: NextRequest,
  contentType?: string
): Headers {
  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  // NOTA: deliberadamente NO copiamos X-Tenant-ID del request al upstream.
  // El backend deriva el tenant del JWT firmado criptográficamente, por
  // lo que confiar en el header del cliente sería un bypass de multi-tenancy.

  return headers;
}

/**
 * Decodifica un JWT y devuelve el tenant_id contenido en su payload.
 *
 * IMPORTANTE: Esta función NO verifica la firma del JWT. Solo decodifica
 * la segunda parte (payload) en base64url y extrae el claim tenant_id.
 *
 * Está pensada para casos donde el frontend necesita conocer el tenant
 * del usuario (e.g. para construir rutas de UI, prefijos de cache) sin
 * tener que hacer un roundtrip al backend. La verificación criptográfica
 * la hace SIEMPRE el backend al validar el JWT en su middleware de auth.
 *
 * Devuelve null si el token no es parseable o no contiene tenant_id.
 */
export function parseTenantIdFromAccessToken(
  token: string | undefined
): string | null {
  if (!token) {
    return null;
  }

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf-8")
    ) as { tenant_id?: unknown };

    return typeof payload.tenant_id === "string" ? payload.tenant_id : null;
  } catch {
    return null;
  }
}

/**
 * Lee un body JSON de forma segura. Si la respuesta no es JSON o el
 * body está vacío, devuelve {} en lugar de lanzar una excepción.
 */
export async function readJsonSafely(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

type BackendErrorResponse = { error?: unknown };

/**
 * Extrae el mensaje de error de un payload JSON del backend.
 * Devuelve null si el payload no tiene un campo "error" string.
 */
export function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }
  const error = (payload as BackendErrorResponse).error;
  return typeof error === "string" ? error : null;
}
