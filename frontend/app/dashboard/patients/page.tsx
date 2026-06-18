import Link from "next/link";
import { cookies } from "next/headers";
import { Eye, Plus, Search, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  backendBaseUrl,
  parseTenantIdFromAccessToken,
} from "@/lib/backend";

type PatientsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type PatientRow = {
  id: string;
  name: string;
  documentID: string;
  email: string;
  phone: string;
  dateOfBirth: string;
};

type PatientsResult = {
  patients: PatientRow[];
  error: string | null;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function stringField(record: Record<string, unknown>, keys: string[], fallback = "—") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function normalizePatient(value: unknown): PatientRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = stringField(value, ["id", "patient_id"], "");
  if (!id) {
    return null;
  }

  const firstName = stringField(value, ["first_name"], "");
  const lastName = stringField(value, ["last_name"], "");
  const combinedName = `${firstName} ${lastName}`.trim();

  return {
    id,
    name: stringField(value, ["name", "full_name"], combinedName || "Unknown patient"),
    documentID: stringField(value, ["document_id", "document_value", "document"], "Protected"),
    email: stringField(value, ["email"], "Protected"),
    phone: stringField(value, ["phone", "phone_number"], "Not provided"),
    dateOfBirth: stringField(value, ["date_of_birth", "dob"], "Not provided"),
  };
}

function extractPatients(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.map(normalizePatient).filter((patient): patient is PatientRow => patient !== null);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [payload.patients, payload.data, payload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizePatient).filter((patient): patient is PatientRow => patient !== null);
    }
  }

  const singlePatient = normalizePatient(payload);
  return singlePatient ? [singlePatient] : [];
}

function extractError(payload: unknown) {
  if (!isRecord(payload)) {
    return "Unable to load patients";
  }

  return typeof payload.error === "string" ? payload.error : "Unable to load patients";
}

async function fetchPatients(documentID: string): Promise<PatientsResult> {
  const cookieStore = await cookies();
  const params = new URLSearchParams({ limit: "25", offset: "0" });

  if (documentID) {
    params.set("document_id", documentID);
  }

  const token = cookieStore.get("access_token")?.value;

  // Derivar el tenant SOLO del JWT firmado (parseTenantIdFromAccessToken
  // decodifica pero no verifica firma — la verificación la hace el backend
  // en su middleware de auth). Se IGNORA completamente el header
  // X-Tenant-ID enviado por el cliente: aceptar ese header sería un
  // bypass de multi-tenancy (usuario de tenant A podría operar sobre
  // tenant B). El backend es la única fuente de verdad.
  //
  // El tenantID derivado aquí se usa únicamente para mostrar mensajes
  // de error útiles y construir la URL. La autorización efectiva la
  // hace el backend al validar el JWT.
  const tenantID = parseTenantIdFromAccessToken(token);

  if (!tenantID) {
    return {
      patients: [],
      error: "No se pudo resolver el identificador de organización",
    };
  }

  const backendUrl = backendBaseUrl();

  try {
    // Construir la URL con el tenantID SOLO como path/query para mantener
    // la trazabilidad. NO se envía X-Tenant-ID al backend.
    const response = await fetch(`${backendUrl}/patients?${params.toString()}`, {
      method: "GET",
      headers: {
        // Cookie de sesión: Next.js Server Components ya reenvían las
        // cookies entrantes al hacer fetch desde el server, pero las
        // hacemos explícitas para dejar clara la intención.
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
      error: error instanceof Error ? error.message : "Unexpected patients directory error",
    };
  }
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const documentID = firstQueryValue(resolvedSearchParams.document_id)?.trim() ?? "";
  const { patients, error } = await fetchPatients(documentID);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-emerald-500">
            Patient directory
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Patients
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Search uses exact Document ID matching because protected patient data is encrypted and indexed with blind indexes.
          </p>
        </div>

        <Link
          href="/dashboard/patients/new"
          className={cn(
            buttonVariants(),
            "h-11 rounded-xl bg-emerald-500 px-4 font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400"
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          Register Patient
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm">
        <form action="/dashboard/patients" className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              name="document_id"
              defaultValue={documentID}
              placeholder="Search by exact Document ID..."
              className="h-11 rounded-xl pl-9"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 rounded-xl border-emerald-500/30 px-5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
            )}
          >
            Search
          </button>
        </form>
      </section>

      {error ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <strong className="font-semibold">Directory unavailable:</strong> {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500" aria-hidden="true" />
          Encrypted records · exact-match search only
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>NAME</TableHead>
              <TableHead>DOCUMENT ID</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>PHONE</TableHead>
              <TableHead>DATE OF BIRTH</TableHead>
              <TableHead className="text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length > 0 ? (
              patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium text-foreground">{patient.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{patient.documentID}</TableCell>
                  <TableCell>{patient.email}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell>{patient.dateOfBirth}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-xl")}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Ver Perfil
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {documentID ? "No patient matched that exact Document ID." : "No patients to display yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
