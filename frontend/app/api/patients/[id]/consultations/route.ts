import { NextRequest, NextResponse } from "next/server";
import {
  backendBaseUrl,
  buildUpstreamHeaders,
  extractErrorMessage,
  isValidUUID,
  readJsonSafely,
} from "@/lib/backend";

type RecordConsultationBody = {
  diagnostic_code?: unknown;
  notes?: unknown;
  metadata?: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
          error: "Invalid patient ID format",
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
