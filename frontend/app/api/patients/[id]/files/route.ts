import { NextRequest, NextResponse } from "next/server";
import {
  backendBaseUrl,
  buildUpstreamHeaders,
  extractErrorMessage,
  isValidUUID,
  readJsonSafely,
} from "@/lib/backend";

// POST - Confirmar subida de archivo
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

    // Validar campos requeridos para confirmar subida
    const { file_name, content_type, size, object_key } = body as Record<string, unknown>;
    
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
    if (!size || typeof size !== "number" || size <= 0) {
      return NextResponse.json(
        { error: "size debe ser un número positivo" },
        { status: 400 }
      );
    }
    if (!object_key || typeof object_key !== "string" || object_key.trim() === "") {
      return NextResponse.json(
        { error: "object_key es requerido" },
        { status: 400 }
      );
    }

    // Construir URL del backend
    const backendUrl = `${backendBaseUrl()}/patients/${patientId}/files`;

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
        size,
        object_key: object_key.trim(),
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
    console.error("Error en proxy POST /api/patients/[id]/files:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET - Listar archivos del paciente
export async function GET(
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

    // Construir URL del backend
    const backendUrl = `${backendBaseUrl()}/patients/${patientId}/files`;

    // Construir headers para el backend
    const headers = buildUpstreamHeaders(request);

    // Realizar solicitud al backend
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers,
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
    console.error("Error en proxy GET /api/patients/[id]/files:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}