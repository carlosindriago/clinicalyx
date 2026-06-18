import { NextRequest, NextResponse } from "next/server";
import {
  backendBaseUrl,
  buildUpstreamHeaders,
  extractErrorMessage,
  isValidUUID,
  readJsonSafely,
} from "@/lib/backend";

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
          error: "Invalid patient ID format",
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
