import { NextRequest, NextResponse } from "next/server";

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");
  const tenantHeader = request.headers.get("x-tenant-id");

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  if (tenantHeader) {
    headers.set("X-Tenant-ID", tenantHeader);
  }

  return headers;
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080/api/v1";
    const logoutEndpoint = `${backendUrl}/auth/logout`;

    // Forward the original request untouched. The Go backend is the single
    // source of truth for verifying the access_token cookie and revoking
    // the session. We never inspect or parse the JWT in the proxy layer.
    await fetch(logoutEndpoint, {
      method: "POST",
      headers: buildUpstreamHeaders(request),
    });

    // Independientemente de si el backend falla, debemos purgar las cookies en el cliente Next.js
    const nextResponse = NextResponse.json(
      { message: "Sesión cerrada correctamente" },
      { status: 200 }
    );

    // Sobrescribir las cookies para forzar su expiración en el navegador del cliente
    nextResponse.cookies.set("access_token", "", {
      path: "/",
      maxAge: -1,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    nextResponse.cookies.set("refresh_token", "", {
      path: "/",
      maxAge: -1,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return nextResponse;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido en proxy de logout";

    console.error("Error en proxy de logout:", message);
    // Asegurar limpieza de cookies incluso ante fallo de red catastrófico
    const errorResponse = NextResponse.json(
      { error: "Error en el servidor de enlace (Proxy) al cerrar sesión" },
      { status: 500 }
    );

    errorResponse.cookies.set("access_token", "", { path: "/", maxAge: -1 });
    errorResponse.cookies.set("refresh_token", "", { path: "/", maxAge: -1 });

    return errorResponse;
  }
}
