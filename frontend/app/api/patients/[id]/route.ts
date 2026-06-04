import { NextRequest, NextResponse } from "next/server";



type BackendErrorResponse = {
  error?: unknown;
};

type JwtPayload = {
  tenant_id?: unknown;
};

function tenantFromAccessToken(token: string | undefined): string | null {
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

function resolveTenantID(request: NextRequest): string | null {
  return (
    request.headers.get("x-tenant-id") ??
    tenantFromAccessToken(request.cookies.get("access_token")?.value)
  );
}

function backendBaseUrl(): string {
  return process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
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
    const tenantID = resolveTenantID(request);
    const cookieHeader = request.headers.get("cookie");

    if (!tenantID) {
      return NextResponse.json(
        { error: "No se pudo resolver el identificador de organización" },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendBaseUrl()}/patients/${id}`, {
      method: "GET",
      headers: {
        "X-Tenant-ID": tenantID,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
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
