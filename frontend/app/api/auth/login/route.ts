import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantID =
      request.headers.get("x-tenant-id") ||
      (typeof body?.tenant_id === "string" ? body.tenant_id.trim() : "");

    if (!tenantID) {
      return NextResponse.json(
        { error: "El Tenant ID es obligatorio para autenticarte" },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "El email y la contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Resolver la URL de backend. Si estamos dentro de Docker, BACKEND_API_URL resuelve a host.docker.internal
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080/api/v1";
    const loginEndpoint = `${backendUrl}/auth/login`;

    const response = await fetch(loginEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantID,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Error de autenticación" },
        { status: response.status }
      );
    }

    // Crear la respuesta del proxy
    const nextResponse = NextResponse.json(data, { status: 200 });

    // Capturar y propagar los headers Set-Cookie del backend de Go
    // getSetCookie devuelve una lista de todos los valores del header Set-Cookie
    const cookiesToForward = response.headers.getSetCookie();

    if (cookiesToForward.length > 0) {
      cookiesToForward.forEach((cookieStr) => {
        nextResponse.headers.append("Set-Cookie", cookieStr);
      });
    }

    return nextResponse;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido en proxy de login";

    console.error("Error en proxy de login:", message);
    return NextResponse.json(
      { error: "Error interno en el servidor de enlace (Proxy)" },
      { status: 500 }
    );
  }
}
