import { NextRequest, NextResponse } from "next/server";

type ScheduleAppointmentBody = {
  patient_id?: unknown;
  doctor_id?: unknown;
  start_time?: unknown;
  end_time?: unknown;
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

function isDoctorUnavailable(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    message.includes("23P01") ||
    message.includes("ErrDoctorNotAvailable") ||
    normalized.includes("médico no se encuentra disponible") ||
    normalized.includes("doctor not available")
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScheduleAppointmentBody;
    const {
      patient_id: patientID,
      doctor_id: doctorID,
      start_time: startTime,
      end_time: endTime,
    } = body;

    if (!isString(patientID) || !isString(doctorID) || !isString(startTime) || !isString(endTime)) {
      return NextResponse.json(
        {
          error:
            "patient_id, doctor_id, start_time y end_time son obligatorios",
        },
        { status: 400 }
      );
    }

    // Validación UUID para prevenir SSRF
    if (!isValidUUID(patientID) || !isValidUUID(doctorID)) {
      return NextResponse.json(
        {
          error: "Invalid UUID format for patient_id or doctor_id",
        },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
    const appointmentEndpoint = `${backendUrl}/patients/${patientID}/appointments`;

    const response = await fetch(appointmentEndpoint, {
      method: "POST",
      headers: buildUpstreamHeaders(request, "application/json"),
      body: JSON.stringify({
        doctor_id: doctorID,
        start_time: startTime,
        end_time: endTime,
      }),
    });

    const payload: unknown = await response.json().catch(() => ({}));
    const backendError = extractErrorMessage(payload);

    if (!response.ok) {
      if (backendError && isDoctorUnavailable(backendError)) {
        return NextResponse.json(
          {
            error:
              "The selected doctor is not available for that time range.",
            code: "domain.ErrDoctorNotAvailable",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: backendError ?? "Unable to schedule appointment" },
        { status: response.status }
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown appointments proxy error";

    console.error("Error in appointments proxy:", message);

    return NextResponse.json(
      { error: "Internal appointments proxy error" },
      { status: 500 }
    );
  }
}
