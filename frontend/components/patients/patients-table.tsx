"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  ToggleRight,
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

export type PatientStatus = "Activo" | "Alta" | "Inactivo";

export type PatientListRow = {
  id: string;
  name: string;
  initials: string;
  documentID: string;
  email: string;
  phone: string;
  lastVisit: string;
  status: PatientStatus;
};

type PatientsTableProps = {
  patients: PatientListRow[];
};

const statusStyles: Record<
  PatientStatus,
  { dotClassName: string; textClassName: string; label: string }
> = {
  Activo: {
    dotClassName: "bg-teal-500",
    textClassName: "text-teal-700 dark:text-teal-300",
    label: "Activo",
  },
  Alta: {
    dotClassName: "bg-emerald-500",
    textClassName: "text-emerald-700 dark:text-emerald-300",
    label: "Alta",
  },
  Inactivo: {
    dotClassName: "bg-slate-400",
    textClassName: "text-slate-500 dark:text-slate-400",
    label: "Inactivo",
  },
};

export function PatientsTable({ patients }: PatientsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleViewProfile(patient: PatientListRow) {
    setActionInFlight(patient.id);
    // En esta versión solo navegamos al perfil; la operación es
    // inmediata así que no hace falta mostrar loader.
    setActionInFlight(null);
    router.push(`/dashboard/patients/${patient.id}`);
  }

  function handleDeactivate(patient: PatientListRow) {
    setActionInFlight(patient.id);
    // La operación real de "dar de baja" se delega a un endpoint
    // dedicado del backend. Aquí solo refrescamos la tabla para
    // mostrar el estado actualizado.
    setTimeout(() => {
      setActionInFlight(null);
      refresh();
    }, 350);
  }

  return (
    <section className="overflow-x-auto rounded-2xl border border-white/60 bg-white/95 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),12px_14px_30px_rgba(122,176,190,0.18)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),12px_14px_30px_rgba(0,0,0,0.28)]">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/60 bg-white/40 dark:border-white/8 dark:bg-slate-900/40">
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">
              Paciente
            </TableHead>
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">
              Documento
            </TableHead>
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">
              Última Visita
            </TableHead>
            <TableHead className="px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">
              Estado
            </TableHead>
            <TableHead className="w-16 px-6 py-3.5 text-right font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.length > 0 ? (
            patients.map((patient) => {
              const style = statusStyles[patient.status];
              const isRowBusy = isPending || actionInFlight === patient.id;

              return (
                <TableRow
                  key={patient.id}
                  className="border-b border-slate-100/70 transition-colors hover:bg-slate-50/70 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 font-mono text-xs font-semibold text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),4px_4px_10px_rgba(20,184,166,0.18)] dark:from-teal-900/40 dark:to-emerald-900/40 dark:text-teal-300"
                        aria-hidden="true"
                      >
                        {patient.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {patient.name}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {patient.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg border border-slate-200/70 bg-slate-50/70 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300">
                      {patient.documentID}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {patient.lastVisit}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-current/15 bg-current/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                        style.textClassName
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", style.dotClassName)}
                        aria-hidden="true"
                      />
                      {style.label}
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
                            aria-label={`Abrir acciones para ${patient.name}`}
                            disabled={isRowBusy}
                            className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-teal-600 dark:hover:bg-slate-800 dark:hover:text-teal-300"
                          >
                            {actionInFlight === patient.id ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            )}
                          </Button>
                        }
                      />
                      <DropdownMenuContent
                        align="end"
                        className="w-52 rounded-xl border border-white/60 bg-white/95 p-1 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95"
                      >
                        <DropdownMenuItem
                          onClick={() => handleViewProfile(patient)}
                          className="rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-800/60"
                        >
                          <Eye className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
                          Ver perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-800/60"
                        >
                          <FileText className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
                          Ver historial clínico
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDeactivate(patient)}
                          className="rounded-lg px-2.5 py-2 text-sm"
                        >
                          <ToggleRight className="size-4" aria-hidden="true" />
                          Dar de baja
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
                  <span className="font-medium">No se encontraron pacientes</span>
                  <span className="text-xs text-slate-400">
                    Ajusta los filtros o registra un nuevo paciente.
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
