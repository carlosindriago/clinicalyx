import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No hay sesión activa para cerrar" },
        { status: 401 }
      );
    }

    let tenantID = "";
    try {
      // Decodificar el payload del JWT de forma no verificada (Go realizará la verificación de firma)
      const payloadPart = accessToken.split(".")[1];
      const decodedPayload = JSON.parse(
        Buffer.from(payloadPart, "base64").toString("utf-8")
      );
      tenantID = decodedPayload.tenant_id;
    } catch (e) {
      console.error("Error al parsear el token JWT en logout proxy:", e);
    }

    if (!tenantID) {
      return NextResponse.json(
        { error: "Token malformado o sin identificador de organización" },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080/api/v1";
    const logoutEndpoint = `${backendUrl}/auth/logout`;

    // Hacer petición al backend de Go para revocar la sesión
    const response = await fetch(logoutEndpoint, {
      method: "POST",
      headers: {
        "X-Tenant-ID": tenantID,
        "Authorization": `Bearer ${accessToken}`,
      },
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
  } catch (error: any) {
    console.error("Error en proxy de logout:", error);
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
