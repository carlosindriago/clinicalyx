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
