import { NextRequest, NextResponse } from "next/server";
import { backendBaseUrl } from "@/lib/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Para /auth/login el tenant puede venir del body (form-driven) o
    // de un header del cliente que aún no está autenticado. Se valida
    // contra el backend como una entrada de autenticación, NO como
    // decisión de autorización. El backend exige SETUP_TOKEN para
    // provisionar el primer admin, y la firma del JWT para sesiones
    // posteriores.
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

    // Resolver la URL de backend SOLO desde variable de entorno.
    const backendUrl = backendBaseUrl();
    const loginEndpoint = `${backendUrl}/auth/login`;

    // Enviamos X-Tenant-ID SOLO en login (form-driven, usuario no
    // autenticado todavía). El backend lo valida contra el cuerpo del
    // request firmado. Para cualquier endpoint post-auth, el backend
    // extrae el tenant del JWT.
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
