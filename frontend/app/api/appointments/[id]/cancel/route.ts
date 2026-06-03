import { NextRequest, NextResponse } from "next/server";

type BackendErrorResponse = {
  error?: unknown;
};

type JwtPayload = {
  tenant_id?: unknown;
};

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = (payload as BackendErrorResponse).error;
  return typeof error === "string" ? error : null;
}

function tenantFromAccessToken(token: string | undefined) {
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
    ) as JwtPayload;

    return typeof payload.tenant_id === "string" ? payload.tenant_id : null;
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tenantID =
      request.headers.get("x-tenant-id") ??
      tenantFromAccessToken(request.cookies.get("access_token")?.value);
    const cookieHeader = request.headers.get("cookie");

    if (!tenantID) {
      return NextResponse.json(
        { error: "No se pudo resolver el identificador de organización" },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
    const cancelEndpoint = `${backendUrl}/appointments/${id}/cancel`;

    const response = await fetch(cancelEndpoint, {
      method: "PATCH",
      headers: {
        "X-Tenant-ID": tenantID,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    const payload: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(payload) ?? "Unable to cancel appointment" },
        { status: response.status }
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown appointment cancellation proxy error";

    console.error("Error in appointment cancellation proxy:", message);

    return NextResponse.json(
      { error: "Internal appointment cancellation proxy error" },
      { status: 500 }
    );
  }
}
