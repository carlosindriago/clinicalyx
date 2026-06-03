"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export type AppointmentRow = {
  id: string;
  time: string;
  duration: string;
  patient: string;
  initials: string;
  doctor: string;
  type: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "In progress";
};

type AppointmentsTableProps = {
  appointments: AppointmentRow[];
};

type CancelAppointmentResponse = {
  error?: unknown;
};

function statusClassName(status: AppointmentRow["status"]) {
  if (status === "Cancelled") {
    return "text-destructive";
  }

  if (status === "Pending") {
    return "text-muted-foreground";
  }

  return "text-emerald-500";
}

function extractErrorMessage(payload: CancelAppointmentResponse) {
  return typeof payload.error === "string"
    ? payload.error
    : "Unable to cancel appointment";
}

export function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDialogOpen = selectedAppointment !== null;
  const isBusy = isCancelling || isPending;

  function closeDialog() {
    if (!isBusy) {
      setSelectedAppointment(null);
      setErrorMessage(null);
    }
  }

  async function confirmCancellation() {
    if (!selectedAppointment) {
      return;
    }

    setErrorMessage(null);
    setIsCancelling(true);

    try {
      const response = await fetch(`/api/appointments/${selectedAppointment.id}/cancel`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as CancelAppointmentResponse;

      if (!response.ok) {
        setErrorMessage(extractErrorMessage(payload));
        return;
      }

      setSelectedAppointment(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected cancellation error";

      setErrorMessage(message);
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-emerald-500">Time</TableHead>
              <TableHead className="px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-emerald-500">Patient</TableHead>
              <TableHead className="px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-emerald-500">Doctor</TableHead>
              <TableHead className="px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-emerald-500">Type</TableHead>
              <TableHead className="px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-emerald-500">Status</TableHead>
              <TableHead className="px-6 py-4 text-right font-mono text-xs uppercase tracking-[0.2em] text-emerald-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => {
              const isCancelled = appointment.status === "Cancelled";

              return (
                <TableRow key={appointment.id} className="hover:bg-emerald-500/5">
                  <TableCell className="px-6 py-5 font-mono text-sm font-semibold text-foreground">
                    <div>{appointment.time}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{appointment.duration}</div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-semibold text-emerald-500">
                        {appointment.initials}
                      </div>
                      <span className="font-medium text-foreground">{appointment.patient}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-muted-foreground">{appointment.doctor}</TableCell>
                  <TableCell className="px-6 py-5">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                      {appointment.type}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <span className={cn("inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider", statusClassName(appointment.status))}>
                      <span className={cn("size-2 rounded-full", isCancelled ? "bg-destructive" : "bg-current")} />
                      {appointment.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Open actions for ${appointment.patient}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isCancelled}
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          <XCircle className="size-4" aria-hidden="true" />
                          Cancel Appointment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <AlertDialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer y el paciente será notificado.
              {selectedAppointment ? ` Se cancelará la cita de ${selectedAppointment.patient}.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBusy}
              onClick={confirmCancellation}
            >
              {isBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Cancelling...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
