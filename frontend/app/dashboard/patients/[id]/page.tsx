import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Mail, Phone, CreditCard, Calendar } from "lucide-react";
import PatientProfileTabs from "./patient-profile-tabs";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PatientProfilePageProps = {
  params: Promise<{ id: string }>;
};

type PatientRow = {
  id: string;
  name: string;
  documentID: string;
  email: string;
  phone: string;
  dateOfBirth: string;
};

type PatientDetailResult = {
  patient: PatientRow | null;
  error: string | null;
};

// Calculate age from date string
function calculateAge(dobString: string): string {
  if (!dobString || dobString === "Not provided" || dobString === "—") {
    return "Not provided";
  }
  try {
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return "Not provided";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return `${age} años`;
  } catch {
    return "Not provided";
  }
}

// Get initials for avatar
function getInitials(name: string): string {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

async function fetchPatientDetail(id: string): Promise<PatientDetailResult> {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  try {
    const response = await fetch(`${protocol}://${host}/api/patients/${id}`, {
      headers: {
        ...(headerStore.get("cookie") ? { Cookie: headerStore.get("cookie") ?? "" } : {}),
        ...(headerStore.get("x-tenant-id") ? { "X-Tenant-ID": headerStore.get("x-tenant-id") ?? "" } : {}),
      },
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 404) {
        return { patient: null, error: "Paciente no encontrado" };
      }
      return { patient: null, error: "No se pudo cargar el perfil del paciente" };
    }

    if (payload && typeof payload === "object" && "id" in payload) {
      const p = payload as Record<string, unknown>;
      return {
        patient: {
          id: String(p.id ?? ""),
          name: String(p.name ?? ""),
          documentID: String(p.document_value ?? p.documentID ?? "Protected"),
          email: String(p.email ?? "Protected"),
          phone: String(p.phone ?? "Not provided"),
          dateOfBirth: String(p.date_of_birth ?? "Not provided"),
        },
        error: null,
      };
    }

    return { patient: null, error: "Formato de respuesta del servidor inválido" };
  } catch (error: unknown) {
    return {
      patient: null,
      error: error instanceof Error ? error.message : "Error de comunicación con la API",
    };
  }
}

export default async function PatientProfilePage(props: PatientProfilePageProps) {
  const { id } = await props.params;
  const { patient, error } = await fetchPatientDetail(id);

  if (error === "Paciente no encontrado" || (!patient && !error)) {
    notFound();
  }

  const age = patient ? calculateAge(patient.dateOfBirth) : "Not provided";
  const initials = patient ? getInitials(patient.name) : "P";

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/patients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a la lista de pacientes
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong className="font-semibold">Error al cargar datos del paciente:</strong> {error}
        </div>
      ) : null}

      {patient && (
        <>
          {/* Header Section */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
              {/* Avatar Icon */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 font-bold text-lg text-emerald-500 shadow-inner dark:bg-emerald-500/20">
                {initials}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {patient.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Secure / E2E Encrypted
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  ID: <span className="font-mono text-xs">{patient.id}</span>
                  {age !== "Not provided" && ` • Edad: ${age}`}
                </p>
              </div>
            </div>
          </section>

          {/* Main Grid Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Sidebar Demographics Card */}
            <div className="lg:col-span-1">
              <Card className="border-border bg-card/95 shadow-sm sticky top-24">
                <CardHeader className="border-b border-border bg-muted/20">
                  <CardTitle className="text-lg font-bold">Datos Demográficos</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  
                  {/* Document ID */}
                  <div className="flex items-start gap-3">
                    <CreditCard className="size-5 text-emerald-500/80 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground font-semibold">Documento de Identidad</p>
                      <p className="text-sm font-mono text-foreground font-medium">{patient.documentID}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <Mail className="size-5 text-emerald-500/80 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground font-semibold">Correo Electrónico</p>
                      <p className="text-sm text-foreground break-all font-medium">{patient.email}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <Phone className="size-5 text-emerald-500/80 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground font-semibold">Teléfono</p>
                      <p className="text-sm text-foreground font-medium">{patient.phone}</p>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="flex items-start gap-3">
                    <Calendar className="size-5 text-emerald-500/80 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground font-semibold">Fecha de Nacimiento</p>
                      <p className="text-sm text-foreground font-medium">{patient.dateOfBirth}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs Area */}
            <div className="lg:col-span-2">
              <PatientProfileTabs patient={patient} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
