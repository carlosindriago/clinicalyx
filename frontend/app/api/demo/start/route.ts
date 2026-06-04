import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Obtener la URL de conexión del backend desde variables de entorno
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080/api/v1";
    const demoEndpoint = `${backendUrl}/demo/start`;

    console.log(`[Proxy Demo] Redireccionando petición a: ${demoEndpoint}`);

    // Realizar llamada POST al backend de Go
    const response = await fetch(demoEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = response.status === 404
        ? "El Modo Demo está desactivado por seguridad (Kill Switch) o el backend está apagado."
        : (data.error || "Error al iniciar el entorno demo");
      return NextResponse.json(
        { error: errorMsg },
        { status: response.status }
      );
    }

    // Construir la respuesta final y propagar las cookies
    const nextResponse = NextResponse.json(data, { status: 200 });
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
        : "Error desconocido en el proxy de demo";

    console.error("[Proxy Demo] Error:", message);
    return NextResponse.json(
      { error: "El Modo Demo está desactivado por seguridad (Kill Switch) o el backend está apagado." },
      { status: 503 }
    );
  }
}
