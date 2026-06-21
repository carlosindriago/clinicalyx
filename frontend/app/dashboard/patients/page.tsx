import Link from "next/link";
import { cookies } from "next/headers";
import { Plus, Search, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PatientsTable,
  type PatientListRow,
  type PatientStatus,
} from "@/components/patients/patients-table";
import { cn } from "@/lib/utils";
import {
  backendBaseUrl,
  parseTenantIdFromAccessToken,
} from "@/lib/backend";

type PatientsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type BackendPatient = {
  id?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  name?: unknown;
  full_name?: unknown;
  document_id?: unknown;
  document_value?: unknown;
  document?: unknown;
  email?: unknown;
  phone?: unknown;
  phone_number?: unknown;
  date_of_birth?: unknown;
  status?: unknown;
  last_visit?: unknown;
  last_consultation_at?: unknown;
};

type PatientsResult = {
  patients: PatientListRow[];
  error: string | null;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function stringField(
  record: Record<string, unknown>,
  keys: string[],
  fallback = ""
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
}

function computeInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeStatus(value: unknown): PatientStatus {
  if (typeof value !== "string") return "Activo";
  const normalized = value.trim().toLowerCase();
  if (normalized === "alta" || normalized === "discharged") return "Alta";
  if (
    normalized === "inactivo" ||
    normalized === "inactive" ||
    normalized === "disabled"
  ) {
    return "Inactivo";
  }
  return "Activo";
}

function normalizePatient(value: unknown): PatientListRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = stringField(value as Record<string, unknown>, ["id", "patient_id"]);
  if (!id) {
    return null;
  }

  const firstName = stringField(value as Record<string, unknown>, ["first_name"]);
  const lastName = stringField(value as Record<string, unknown>, ["last_name"]);
  const combinedName = `${firstName} ${lastName}`.trim();
  const name = stringField(
    value as Record<string, unknown>,
    ["name", "full_name"],
    combinedName || "Paciente sin nombre"
  );

  const lastVisitRaw = stringField(
    value as Record<string, unknown>,
    ["last_visit", "last_consultation_at", "updated_at"]
  );

  return {
    id,
    name,
    initials: computeInitials(name),
    documentID: stringField(
      value as Record<string, unknown>,
      ["document_id", "document_value", "document"],
      "Protegido"
    ),
    email: stringField(
      value as Record<string, unknown>,
      ["email"],
      "Protegido"
    ),
    phone: stringField(
      value as Record<string, unknown>,
      ["phone", "phone_number"],
      "—"
    ),
    lastVisit: lastVisitRaw || "Sin visitas",
    status: normalizeStatus((value as BackendPatient).status),
  };
}

function extractPatients(payload: unknown): PatientListRow[] {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizePatient)
      .filter((patient): patient is PatientListRow => patient !== null);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [payload.patients, payload.data, payload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map(normalizePatient)
        .filter((patient): patient is PatientListRow => patient !== null);
    }
  }

  const singlePatient = normalizePatient(payload);
  return singlePatient ? [singlePatient] : [];
}

function extractError(payload: unknown): string {
  if (!isRecord(payload)) {
    return "No se pudo cargar el directorio de pacientes";
  }
  return typeof payload.error === "string"
    ? payload.error
    : "No se pudo cargar el directorio de pacientes";
}

async function fetchPatients(
  documentID: string,
  statusFilter: PatientStatus | "all"
): Promise<PatientsResult> {
  const cookieStore = await cookies();
  const params = new URLSearchParams({ limit: "50", offset: "0" });

  if (documentID) {
    params.set("document_id", documentID);
  }
  if (statusFilter !== "all") {
    params.set("status", statusFilter);
  }

  const token = cookieStore.get("access_token")?.value;

  // El tenant se deriva SOLO del JWT firmado. NO se confía en el
  // header X-Tenant-ID del cliente (bypass de multi-tenancy).
  // La verificación criptográfica la hace el backend en cada request.
  const tenantID = parseTenantIdFromAccessToken(token);

  if (!tenantID) {
    return {
      patients: [],
      error: "No se pudo resolver el identificador de organización",
    };
  }

  const backendUrl = backendBaseUrl();

  try {
    const response = await fetch(`${backendUrl}/patients?${params.toString()}`, {
      method: "GET",
      headers: {
        ...(token ? { Cookie: `access_token=${token}` } : {}),
      },
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { patients: [], error: extractError(payload) };
    }

    return { patients: extractPatients(payload), error: null };
  } catch (error: unknown) {
    return {
      patients: [],
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al cargar el directorio",
    };
  }
}

const STATUS_FILTERS: Array<{
  key: PatientStatus | "all";
  label: string;
}> = [
  { key: "all", label: "Todos" },
  { key: "Activo", label: "Activos" },
  { key: "Alta", label: "Alta" },
  { key: "Inactivo", label: "Inactivos" },
];

function isPatientStatusFilter(value: string): value is PatientStatus | "all" {
  return (
    value === "all" ||
    value === "Activo" ||
    value === "Alta" ||
    value === "Inactivo"
  );
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const documentID =
    firstQueryValue(resolvedSearchParams.document_id)?.trim() ?? "";
  const statusRaw =
    firstQueryValue(resolvedSearchParams.status)?.trim() ?? "all";
  const statusFilter: PatientStatus | "all" = isPatientStatusFilter(statusRaw)
    ? statusRaw
    : "all";

  const { patients, error } = await fetchPatients(documentID, statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal-600 dark:text-teal-400">
            Directorio Clínico
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-50 sm:text-[2rem]">
            Pacientes
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Búsqueda exacta por documento porque los datos protegidos del
            paciente están cifrados e indexados con blind indexes.
          </p>
        </div>

        <Link
          href="/dashboard/patients/new"
          className={cn(
            buttonVariants(),
            "group/button h-12 gap-2 rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(29,162,190,0.28),inset_1px_1px_0_rgba(255,255,255,0.35)] transition-all hover:brightness-105 dark:border-white/10"
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nuevo Paciente
        </Link>
      </header>

      {/* Search & Filter Card */}
      <section className="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),12px_14px_30px_rgba(122,176,190,0.18)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),12px_14px_30px_rgba(0,0,0,0.26)]">
        <form
          action="/dashboard/patients"
          method="GET"
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              name="document_id"
              defaultValue={documentID}
              placeholder="Buscar por DNI o documento exacto..."
              className="h-12 rounded-2xl border-white/60 bg-white/70 pl-10 text-sm shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),6px_6px_16px_rgba(130,188,198,0.12)] placeholder:text-slate-400 dark:border-white/8 dark:bg-slate-900/60 dark:text-slate-100"
              autoComplete="off"
            />
          </div>

          {/* Preserva el filtro activo al enviar el form de búsqueda */}
          <input type="hidden" name="status" value={statusFilter} />

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,162,190,0.22)] transition hover:brightness-105"
          >
            <Search className="size-4" aria-hidden="true" />
            Buscar
          </button>
        </form>

        {/* Pills de filtro rápido: navegan a la misma ruta con ?status=... */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Filtros
          </span>
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.key;
            const params = new URLSearchParams();
            if (documentID) {
              params.set("document_id", documentID);
            }
            if (filter.key !== "all") {
              params.set("status", filter.key);
            }
            const queryString = params.toString();
            const href = queryString
              ? `/dashboard/patients?${queryString}`
              : "/dashboard/patients";

            return (
              <Link
                key={filter.key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-medium transition-all",
                  isActive
                    ? "border-teal-500/40 bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-800 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),4px_4px_10px_rgba(20,184,166,0.18)] dark:border-teal-400/30 dark:from-teal-900/40 dark:to-emerald-900/40 dark:text-teal-200"
                    : "border-slate-200/70 bg-white/70 text-slate-600 hover:border-teal-300/60 hover:text-teal-700 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-teal-400/40 dark:hover:text-teal-200"
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Banner de error (no rompe el layout Soft-UI) */}
      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300/40 bg-amber-100/60 px-4 py-3 text-sm text-amber-800 shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)] dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <strong className="font-semibold">Directorio no disponible:</strong>{" "}
          {error}
        </div>
      ) : null}

      {/* Tabla de pacientes (Client Component) */}
      <PatientsTable patients={patients} />

      {/* Footer note: indicación del modo cifrado */}
      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="size-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        Registros cifrados · búsqueda exacta únicamente
      </div>
    </div>
  );
}
