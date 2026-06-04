import { NextRequest, NextResponse } from "next/server";

type CreatePatientBody = {
  first_name?: unknown;
  last_name?: unknown;
  name?: unknown;
  document_id?: unknown;
  document_type?: unknown;
  document_value?: unknown;
  email?: unknown;
  phone?: unknown;
  date_of_birth?: unknown;
};

type BackendErrorResponse = {
  error?: unknown;
};

type JwtPayload = {
  tenant_id?: unknown;
};

const e164Regex = /^\+[1-9]\d{9,14}$/;

function isNonEmptyString(value: unknown): value is string {
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

function resolveTenantID(request: NextRequest) {
  return (
    request.headers.get("x-tenant-id") ??
    tenantFromAccessToken(request.cookies.get("access_token")?.value)
  );
}

function backendBaseUrl() {
  return process.env.BACKEND_API_URL ?? "http://clinicalyx_api:8080/api/v1";
}

async function readJsonSafely(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

function buildPatientListUrl(request: NextRequest) {
  const url = new URL(`${backendBaseUrl()}/patients`);
  const limit = request.nextUrl.searchParams.get("limit");
  const offset = request.nextUrl.searchParams.get("offset");
  const documentID = request.nextUrl.searchParams.get("document_id");

  if (limit) {
    url.searchParams.set("limit", limit);
  }

  if (offset) {
    url.searchParams.set("offset", offset);
  }

  if (documentID) {
    url.searchParams.set("document_id", documentID);
  }

  return url;
}

export async function GET(request: NextRequest) {
  try {
    const tenantID = resolveTenantID(request);
    const cookieHeader = request.headers.get("cookie");

    if (!tenantID) {
      return NextResponse.json(
        { error: "No se pudo resolver el identificador de organización" },
        { status: 400 }
      );
    }

    const response = await fetch(buildPatientListUrl(request), {
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
        { error: extractErrorMessage(payload) ?? "Unable to load patients" },
        { status: response.status }
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown patients proxy error";

    console.error("Error in patients GET proxy:", message);

    return NextResponse.json(
      { error: "Internal patients proxy error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantID = resolveTenantID(request);
    const cookieHeader = request.headers.get("cookie");

    if (!tenantID) {
      return NextResponse.json(
        { error: "No se pudo resolver el identificador de organización" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CreatePatientBody;
    const firstName = isNonEmptyString(body.first_name)
      ? body.first_name.trim()
      : "";
    const lastName = isNonEmptyString(body.last_name)
      ? body.last_name.trim()
      : "";
    const providedName = isNonEmptyString(body.name) ? body.name.trim() : "";
    const name = providedName || `${firstName} ${lastName}`.trim();
    const documentValue = isNonEmptyString(body.document_id)
      ? body.document_id.trim()
      : isNonEmptyString(body.document_value)
        ? body.document_value.trim()
        : "";
    const documentType = isNonEmptyString(body.document_type)
      ? body.document_type.trim().toUpperCase()
      : "DNI";
    const email = isNonEmptyString(body.email) ? body.email.trim() : "";
    const phone = isNonEmptyString(body.phone) ? body.phone.trim() : "";
    const dateOfBirth = isNonEmptyString(body.date_of_birth)
      ? body.date_of_birth.trim()
      : "";

    if (!name || !documentValue || !email) {
      return NextResponse.json(
        { error: "first_name, last_name, document_id and email are required" },
        { status: 400 }
      );
    }

    if (phone && !e164Regex.test(phone.replaceAll(" ", ""))) {
      return NextResponse.json(
        { error: "Invalid E.164 format. Use a value like +1234567890." },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendBaseUrl()}/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantID,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        name,
        document_type: documentType,
        document_value: documentValue,
        email,
        phone: phone.replaceAll(" ", ""),
        date_of_birth: dateOfBirth,
      }),
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(payload) ?? "Unable to register patient" },
        { status: response.status }
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown patient registration error";

    console.error("Error in patients POST proxy:", message);

    return NextResponse.json(
      { error: "Internal patients proxy error" },
      { status: 500 }
    );
  }
}
