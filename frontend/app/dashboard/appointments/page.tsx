import Link from "next/link";
import { Plus } from "lucide-react";

import {
  AppointmentsTable,
  type AppointmentRow,
} from "@/components/appointments-table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimeframeFilter = "today" | "tomorrow" | "week" | "all";

const TIMEFRAME_FILTERS: Array<{
  key: TimeframeFilter;
  label: string;
}> = [
  { key: "today", label: "Hoy" },
  { key: "tomorrow", label: "Mañana" },
  { key: "week", label: "Esta Semana" },
  { key: "all", label: "Todas" },
];

function isTimeframeFilter(value: string): value is TimeframeFilter {
  return (
    value === "today" ||
    value === "tomorrow" ||
    value === "week" ||
    value === "all"
  );
}

const APPOINTMENTS_BY_TIMEFRAME: Record<TimeframeFilter, AppointmentRow[]> = {
  today: [
    {
      id: "6f4e3c1e-5ef7-4a77-bb60-44c8347c6011",
      time: "09:00 AM",
      date: "Hoy",
      patient: "Alice Walker",
      patientInitials: "AW",
      consultationType: "Chequeo General",
      doctor: "Dr. Smith",
      doctorInitials: "DS",
      status: "Programada",
    },
    {
      id: "223ac633-995f-4c54-a510-7335428bc1f3",
      time: "10:30 AM",
      date: "Hoy",
      patient: "James Miller",
      patientInitials: "JM",
      consultationType: "Cardiología",
      doctor: "Dr. Sarah Chen",
      doctorInitials: "SC",
      status: "En Progreso",
    },
    {
      id: "83fa9f65-4f74-4f08-b034-fd218ef8a078",
      time: "01:15 PM",
      date: "Hoy",
      patient: "Robert King",
      patientInitials: "RK",
      consultationType: "Pre-operatorio",
      doctor: "Dr. Smith",
      doctorInitials: "DS",
      status: "Programada",
    },
    {
      id: "d57a7bda-e90b-44d5-9fdb-d6249ab1361f",
      time: "02:30 PM",
      date: "Hoy",
      patient: "Elena Hernández",
      patientInitials: "EH",
      consultationType: "Dermatología",
      doctor: "Dr. Marcus Thorne",
      doctorInitials: "MT",
      status: "Cancelada",
    },
    {
      id: "a2c5b18f-3e2d-4f1a-9b8c-7d6e5f4a3b2c",
      time: "04:00 PM",
      date: "Hoy",
      patient: "Lucía Romero",
      patientInitials: "LR",
      consultationType: "Pediatría",
      doctor: "Dr. Sarah Chen",
      doctorInitials: "SC",
      status: "Completada",
    },
  ],
  tomorrow: [
    {
      id: "b3d6c29a-4f3e-5a2b-ac9d-8e7f6a5b4c3d",
      time: "08:30 AM",
      date: "Mañana",
      patient: "Pedro Martínez",
      patientInitials: "PM",
      consultationType: "Cardiología",
      doctor: "Dr. Sarah Chen",
      doctorInitials: "SC",
      status: "Programada",
    },
    {
      id: "c4e7d3ab-5a4f-6b3c-bd0e-9f8a7b6c5d4e",
      time: "11:00 AM",
      date: "Mañana",
      patient: "Sofía Castillo",
      patientInitials: "SC",
      consultationType: "Chequeo General",
      doctor: "Dr. Smith",
      doctorInitials: "DS",
      status: "Programada",
    },
    {
      id: "d5f8e4bc-6b5a-7c4d-ce1f-a09b8c7d6e5f",
      time: "03:30 PM",
      date: "Mañana",
      patient: "Andrés Torres",
      patientInitials: "AT",
      consultationType: "Traumatología",
      doctor: "Dr. Marcus Thorne",
      doctorInitials: "MT",
      status: "Programada",
    },
  ],
  week: [
    {
      id: "e6a9f5cd-7c6b-8d5e-df20-b1ac9d8e7f60",
      time: "10:00 AM",
      date: "Jueves 20",
      patient: "María González",
      patientInitials: "MG",
      consultationType: "Ginecología",
      doctor: "Dr. Sarah Chen",
      doctorInitials: "SC",
      status: "Programada",
    },
    {
      id: "f7b0a6de-8d7c-9e6f-e031-c2bd0e9f8071",
      time: "02:00 PM",
      date: "Viernes 21",
      patient: "Diego Vargas",
      patientInitials: "DV",
      consultationType: "Cardiología",
      doctor: "Dr. Smith",
      doctorInitials: "DS",
      status: "Programada",
    },
    {
      id: "08c1b7ef-9e8d-0f7a-f142-d3ce1fa09182",
      time: "11:30 AM",
      date: "Sábado 22",
      patient: "Camila Mendoza",
      patientInitials: "CM",
      consultationType: "Pediatría",
      doctor: "Dr. Marcus Thorne",
      doctorInitials: "MT",
      status: "Programada",
    },
  ],
  all: [],
};

type AppointmentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const timeframeRaw = firstQueryValue(resolvedSearchParams.timeframe)?.trim() ?? "today";
  const timeframe: TimeframeFilter = isTimeframeFilter(timeframeRaw)
    ? timeframeRaw
    : "today";

  const appointments = APPOINTMENTS_BY_TIMEFRAME[timeframe];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal-600 dark:text-teal-300">
            Agenda Clínica
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-50 sm:text-[2rem]">
            Citas Programadas
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Gestiona la agenda del consultorio. Filtra por intervalo de
            tiempo para ver solo lo relevante a tu turno.
          </p>
        </div>

        <Link
          href="/dashboard/appointments/new"
          className={cn(
            buttonVariants(),
            "group/button h-12 gap-2 rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(29,162,190,0.28),inset_1px_1px_0_rgba(255,255,255,0.35)] transition-all hover:brightness-105 dark:border-white/10"
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nueva Cita
        </Link>
      </header>

      {/* Filtros temporales (server-side via URL params) */}
      <section className="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),12px_14px_30px_rgba(122,176,190,0.18)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),12px_14px_30px_rgba(0,0,0,0.26)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Filtrar por
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              Intervalo de tiempo
            </p>
          </div>

          {/* Pills de filtro temporal: navegan a ?timeframe=... */}
          <div
            role="tablist"
            aria-label="Filtro de intervalo de tiempo"
            className="flex flex-wrap items-center gap-2"
          >
            {TIMEFRAME_FILTERS.map((filter) => {
              const isActive = timeframe === filter.key;
              const href =
                filter.key === "today"
                  ? "/dashboard/appointments"
                  : `/dashboard/appointments?timeframe=${filter.key}`;

              return (
                <Link
                  key={filter.key}
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center rounded-full border px-4 text-xs font-semibold transition-all",
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
        </div>
      </section>

      {/* Tabla de citas */}
      <AppointmentsTable appointments={appointments} />
    </div>
  );
}
