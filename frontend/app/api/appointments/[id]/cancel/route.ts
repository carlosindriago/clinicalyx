import { NextRequest, NextResponse } from "next/server";

type BackendErrorResponse = {
  error?: unknown;
};

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = (payload as BackendErrorResponse).error;
  return typeof error === "string" ? error : null;
}

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validación UUID para prevenir SSRF
    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          error: "Invalid UUID format for appointment ID",
        },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
    const cancelEndpoint = `${backendUrl}/appointments/${id}/cancel`;

    const response = await fetch(cancelEndpoint, {
      method: "PATCH",
      headers: buildUpstreamHeaders(request),
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
