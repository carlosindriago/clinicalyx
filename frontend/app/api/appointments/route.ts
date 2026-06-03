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

function isDoctorUnavailable(message: string) {
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

    const backendUrl = process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
    const appointmentEndpoint = `${backendUrl}/patients/${patientID}/appointments`;

    const response = await fetch(appointmentEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantID,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
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
