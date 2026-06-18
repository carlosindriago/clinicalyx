import { NextRequest, NextResponse } from "next/server";
import {
  backendBaseUrl,
  buildUpstreamHeaders,
  extractErrorMessage,
  isValidUUID,
  readJsonSafely,
} from "@/lib/backend";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const patientId = params.id;

    // Validar que el patientId sea un UUID válido
    if (!isValidUUID(patientId)) {
      return NextResponse.json(
        { error: "patient_id inválido" },
        { status: 400 }
      );
    }

    // Leer el cuerpo de la solicitud
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Cuerpo de solicitud inválido" },
        { status: 400 }
      );
    }

    // Validar campos requeridos
    const { file_name, content_type } = body as Record<string, unknown>;
    if (!file_name || typeof file_name !== "string" || file_name.trim() === "") {
      return NextResponse.json(
        { error: "file_name es requerido" },
        { status: 400 }
      );
    }
    if (!content_type || typeof content_type !== "string" || content_type.trim() === "") {
      return NextResponse.json(
        { error: "content_type es requerido" },
        { status: 400 }
      );
    }

    // Construir URL del backend
    const backendUrl = `${backendBaseUrl()}/patients/${patientId}/files/presign`;

    // Construir headers para el backend
    const headers = buildUpstreamHeaders(request);
    headers.set("Content-Type", "application/json");

    // Realizar solicitud al backend
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        file_name: file_name.trim(),
        content_type: content_type.trim(),
      }),
    });

    // Leer respuesta del backend
    const backendPayload = await readJsonSafely(backendResponse);

    // Extraer mensaje de error si existe
    const errorMessage = extractErrorMessage(backendPayload);

    // Si hay un error en el backend, propagarlo
    if (!backendResponse.ok || errorMessage) {
      return NextResponse.json(
        {
          error: errorMessage || `Error del backend: ${backendResponse.statusText}`,
        },
        { status: backendResponse.status }
      );
    }

    // Devolver respuesta exitosa
    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch (error) {
    console.error("Error en proxy /api/patients/[id]/files/presign:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}