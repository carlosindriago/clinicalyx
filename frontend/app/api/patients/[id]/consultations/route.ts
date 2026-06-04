import { NextRequest, NextResponse } from "next/server";

type RecordConsultationBody = {
  diagnostic_code?: unknown;
  notes?: unknown;
  metadata?: unknown;
};

type BackendErrorResponse = {
  error?: unknown;
};

type JwtPayload = {
  tenant_id?: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = (payload as BackendErrorResponse).error;
  return typeof error === "string" ? error : null;
}

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

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: patientID } = await props.params;
    const tenantID = resolveTenantID(request);
    const cookieHeader = request.headers.get("cookie");

    if (!tenantID) {
      return NextResponse.json(
        { error: "No se pudo resolver el identificador de organización" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as RecordConsultationBody;
    const {
      diagnostic_code: diagnosticCode,
      notes,
      metadata,
    } = body;

    if (!isString(diagnosticCode) || !isString(notes)) {
      return NextResponse.json(
        { error: "El código de diagnóstico y las notas clínicas son campos requeridos" },
        { status: 400 }
      );
    }

    const backendUrl = backendBaseUrl();
    const consultationsEndpoint = `${backendUrl}/patients/${patientID}/consultations`;

    const response = await fetch(consultationsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantID,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        diagnostic_code: diagnosticCode,
        notes: notes,
        metadata: metadata ?? {},
      }),
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      const backendError = extractErrorMessage(payload);
      return NextResponse.json(
        { error: backendError ?? "Unable to record consultation" },
        { status: response.status }
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown consultations proxy error";

    console.error("Error in consultations POST proxy:", message);

    return NextResponse.json(
      { error: "Internal consultations proxy error" },
      { status: 500 }
    );
  }
}
