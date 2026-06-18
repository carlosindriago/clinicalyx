import { NextRequest, NextResponse } from "next/server";
import {
  backendBaseUrl,
  buildUpstreamHeaders,
  extractErrorMessage,
  isValidUUID,
} from "@/lib/backend";

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

    const backendUrl = backendBaseUrl();
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
