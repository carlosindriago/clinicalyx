// app/api/demo/start/route.ts
import { NextResponse } from "next/server";

/**
 * GET: indica si la demo efímera está habilitada (no expone secretos).
 */
export async function GET() {
  return NextResponse.json({
    enabled: process.env.NEXT_PUBLIC_ENABLE_EPHEMERAL_DEMO === "true",
  });
}

/**
 * POST: arranca un sandbox demo efímero.
 *
 * SEGURIDAD CRÍTICA: el backend devuelve access_token y refresh_token
 * en el body JSON. Si los reenviamos tal cual al cliente, cualquier
 * XSS (o dependencia comprometida) puede robarlos. Por lo tanto:
 *
 *  1. Las cookies access_token y refresh_token llegan vía Set-Cookie
 *     en la respuesta del backend, con flags HttpOnly+Secure+SameSite.
 *     Las propagamos como cookies HttpOnly al cliente.
 *
 *  2. Filtramos access_token y refresh_token del body JSON antes de
 *     devolverlo al cliente. El cliente solo recibe los datos seguros
 *     (tenant_id, credentials) y la sesión viaja exclusivamente en
 *     cookies HttpOnly, inaccesibles desde JavaScript.
 */
export async function POST() {
  try {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080/api/v1";
    const demoEndpoint = `${backendUrl}/demo/start`;

    console.log(`[Proxy Demo] Redireccionando petición a: ${demoEndpoint}`);

    const response = await fetch(demoEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Parsear el body antes de hacer cualquier otra cosa: si la respuesta
    // es 404 / error, no hay tokens que filtrar y devolvemos directo.
    const data: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        response.status === 404
          ? "El Modo Demo está desactivado por seguridad (Kill Switch) o el backend está apagado."
          : extractErrorMessage(data) || "Error al iniciar el entorno demo";
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // Construir la respuesta: propagar Set-Cookie del backend, pero
    // filtrar los tokens del body. El backend ya marca las cookies
    // como HttpOnly+Secure+SameSite=Strict; las reenviamos tal cual
    // para que el navegador las acepte.
    const safePayload = sanitizeDemoPayload(data);
    const nextResponse = NextResponse.json(safePayload, { status: 200 });

    const cookiesToForward = response.headers.getSetCookie();
    if (cookiesToForward.length > 0) {
      for (const cookieStr of cookiesToForward) {
        nextResponse.headers.append("Set-Cookie", cookieStr);
      }
    }

    return nextResponse;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido en el proxy de demo";

    console.error("[Proxy Demo] Error:", message);
    return NextResponse.json(
      { error: "El Modo Demo está desactivado por seguridad (Kill Switch) o el backend está apagado." },
      { status: 503 }
    );
  }
}

type DemoBackendResponse = {
  status?: unknown;
  message?: unknown;
  tenant_id?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  credentials?: unknown;
};

type SafeDemoResponse = {
  status?: string;
  message?: string;
  tenant_id?: string;
  credentials?: unknown;
};

/**
 * Elimina access_token y refresh_token del payload del backend antes de
 * devolverlo al cliente. Las cookies Set-Cookie siguen siendo el canal
 * de transporte de los tokens (HttpOnly, inaccesible a JS).
 */
function sanitizeDemoPayload(payload: unknown): SafeDemoResponse {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const data = payload as DemoBackendResponse;
  const safe: SafeDemoResponse = {};

  if (typeof data.status === "string") {
    safe.status = data.status;
  }
  if (typeof data.message === "string") {
    safe.message = data.message;
  }
  if (typeof data.tenant_id === "string") {
    safe.tenant_id = data.tenant_id;
  }
  if (data.credentials && typeof data.credentials === "object") {
    safe.credentials = data.credentials;
  }
  // Deliberadamente NO copiamos access_token ni refresh_token.

  return safe;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}
