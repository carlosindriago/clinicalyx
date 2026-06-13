import { NextRequest, NextResponse } from "next/server";

type RecordConsultationBody = {
  diagnostic_code?: unknown;
  notes?: unknown;
  metadata?: unknown;
};

type BackendErrorResponse = {
  error?: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = (payload as BackendErrorResponse).error;
  return typeof error === "string" ? error : null;
}

function backendBaseUrl(): string {
  return process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
}

function buildUpstreamHeaders(request: NextRequest, contentType?: string): Headers {
  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");
  const tenantHeader = request.headers.get("x-tenant-id");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  if (tenantHeader) {
    headers.set("X-Tenant-ID", tenantHeader);
  }

  return headers;
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

    // Validación UUID para prevenir SSRF
    if (!isValidUUID(patientID)) {
      return NextResponse.json(
        {
          error: "Invalid UUID format for patient ID",
        },
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
      headers: buildUpstreamHeaders(request, "application/json"),
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
