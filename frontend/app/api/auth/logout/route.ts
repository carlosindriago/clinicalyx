// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Resolver la URL de backend SOLO desde variable de entorno.
    const backendUrl = process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
    const logoutEndpoint = `${backendUrl}/auth/logout`;

    // Reenviar SOLO la cookie de sesión. NO se envía X-Tenant-ID: el
    // backend extrae el tenant del JWT firmado criptográficamente.
    // Aceptar el header del cliente sería un bypass de multi-tenancy.
    const headers = new Headers();
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    await fetch(logoutEndpoint, {
      method: "POST",
      headers,
    });

    // Independientemente de si el backend falla, debemos purgar las
    // cookies en el cliente Next.js.
    const nextResponse = NextResponse.json(
      { message: "Sesión cerrada correctamente" },
      { status: 200 }
    );

    // Sobrescribir las cookies para forzar su expiración en el navegador.
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
    // Asegurar limpieza de cookies incluso ante fallo de red catastrófico.
    const errorResponse = NextResponse.json(
      { error: "Error en el servidor de enlace (Proxy) al cerrar sesión" },
      { status: 500 }
    );

    errorResponse.cookies.set("access_token", "", { path: "/", maxAge: -1 });
    errorResponse.cookies.set("refresh_token", "", { path: "/", maxAge: -1 });

    return errorResponse;
  }
}
