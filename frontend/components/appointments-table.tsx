"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarClock,
  Eye,
  Loader2,
  MoreHorizontal,
  PlayCircle,
  RefreshCcw,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AppointmentStatus =
  | "Programada"
  | "En Progreso"
  | "Completada"
  | "Cancelada";

export type AppointmentRow = {
  id: string;
  time: string;
  date: string;
  patient: string;
  patientInitials: string;
  consultationType: string;
  doctor: string;
  doctorInitials: string;
  status: AppointmentStatus;
};

type AppointmentsTableProps = {
  appointments: AppointmentRow[];
};

const statusStyles: Record<
  AppointmentStatus,
  { dotClassName: string; textClassName: string }
> = {
  Programada: {
    dotClassName: "bg-teal-500",
    textClassName: "text-teal-700 dark:text-teal-400",
  },
  "En Progreso": {
    dotClassName: "bg-amber-500",
    textClassName: "text-amber-700 dark:text-amber-300",
  },
  Completada: {
    dotClassName: "bg-emerald-500",
    textClassName: "text-emerald-700 dark:text-emerald-300",
  },
  Cancelada: {
    dotClassName: "bg-slate-400",
    textClassName: "text-slate-500 dark:text-slate-400",
  },
};

export function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleStart(appointment: AppointmentRow) {
    setActionInFlight(appointment.id);
    // Stub: navegaría a la vista de consulta activa.
    setTimeout(() => {
      setActionInFlight(null);
      router.push(`/dashboard/patients/${appointment.id}`);
    }, 300);
  }

  function handleReschedule(appointment: AppointmentRow) {
    setActionInFlight(appointment.id);
    // Stub: abriría un modal/dialog de reprogramación.
    setTimeout(() => {
      setActionInFlight(null);
      refresh();
    }, 300);
  }

  function handleCancel(appointment: AppointmentRow) {
    setActionInFlight(appointment.id);
    // Stub: la cancelación real llama a /api/appointments/{id}/cancel
    // (PATCH) y refresca. Aquí solo refrescamos.
    setTimeout(() => {
      setActionInFlight(null);
      refresh();
    }, 300);
  }

  return (
    <section className="overflow-x-auto rounded-2xl border border-white/60 bg-white/95 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),12px_14px_30px_rgba(122,176,190,0.18)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),12px_14px_30px_rgba(0,0,0,0.28)]">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/60 bg-white/40 dark:border-white/8 dark:bg-slate-900/40">
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
              Horario
            </TableHead>
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
              Paciente
            </TableHead>
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
              Doctor
            </TableHead>
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
              Estado
            </TableHead>
            <TableHead className="w-16 px-6 py-3.5 text-right font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length > 0 ? (
            appointments.map((appointment) => {
              const style = statusStyles[appointment.status];
              const isCancelled = appointment.status === "Cancelada";
              const isRowBusy =
                isPending || actionInFlight === appointment.id;

              return (
                <TableRow
                  key={appointment.id}
                  className="border-b border-slate-100/70 transition-colors hover:bg-slate-50/70 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {appointment.time}
                      </span>
                      <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {appointment.date}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 font-mono text-xs font-semibold text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),4px_4px_10px_rgba(20,184,166,0.18)] dark:from-teal-900/40 dark:to-emerald-900/40 dark:text-teal-400"
                        aria-hidden="true"
                      >
                        {appointment.patientInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {appointment.patient}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {appointment.consultationType}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/60 bg-slate-100/70 font-mono text-[10px] font-semibold text-slate-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95)] dark:border-white/8 dark:bg-slate-800/60 dark:text-slate-300"
                        aria-hidden="true"
                      >
                        {appointment.doctorInitials}
                      </div>
                      <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                        {appointment.doctor}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-current/15 bg-current/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                        style.textClassName
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          style.dotClassName
                        )}
                        aria-hidden="true"
                      />
                      {appointment.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Abrir acciones para la cita de ${appointment.patient}`}
                            disabled={isRowBusy}
                            className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-teal-600 dark:hover:bg-slate-800 dark:hover:text-teal-300"
                          >
                            {actionInFlight === appointment.id ? (
                              <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <MoreHorizontal
                                className="size-4"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        }
                      />
                      <DropdownMenuContent
                        align="end"
                        className="w-56 rounded-xl border border-white/60 bg-white/95 p-1 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95"
                      >
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/patients/${appointment.id}`)}
                          className="rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-800/60"
                        >
                          <Eye className="size-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isCancelled}
                          onClick={() => handleStart(appointment)}
                          className="rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-800/60"
                        >
                          <PlayCircle className="size-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                          Iniciar Consulta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isCancelled}
                          onClick={() => handleReschedule(appointment)}
                          className="rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-800/60"
                        >
                          <RefreshCcw className="size-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                          Reprogramar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isCancelled}
                          onClick={() => handleCancel(appointment)}
                          className="rounded-lg px-2.5 py-2 text-sm text-rose-600 hover:bg-rose-50 focus:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:focus:bg-rose-950/40"
                        >
                          <XCircle className="size-4" aria-hidden="true" />
                          Cancelar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-32 px-6 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                <div className="flex flex-col items-center gap-1">
                  <CalendarClock
                    className="size-6 text-slate-300 dark:text-slate-600"
                    aria-hidden="true"
                  />
                  <span className="font-medium">
                    No hay citas en este intervalo
                  </span>
                  <span className="text-xs text-slate-400">
                    Cambia el filtro o agenda una nueva cita.
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}
