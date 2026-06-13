import { NextRequest, NextResponse } from "next/server";

type BackendErrorResponse = {
  error?: unknown;
};

function backendBaseUrl(): string {
  return process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
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

  // Only forward the tenant header if the caller explicitly provided it.
  // The Go backend is the single source of truth for tenant resolution from
  // the cryptographically verified access_token cookie.
  if (tenantHeader) {
    headers.set("X-Tenant-ID", tenantHeader);
  }

  return headers;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = (payload as BackendErrorResponse).error;
  return typeof error === "string" ? error : null;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await props.params;

    // Validación UUID para prevenir SSRF
    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          error: "Invalid UUID format for patient ID",
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendBaseUrl()}/patients/${id}`, {
      method: "GET",
      headers: buildUpstreamHeaders(request),
      cache: "no-store",
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(payload) ?? "Unable to load patient" },
        { status: response.status }
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown patient proxy error";

    console.error("Error in patient GET proxy:", message);

    return NextResponse.json(
      { error: "Internal patient proxy error" },
      { status: 500 }
    );
  }
}
