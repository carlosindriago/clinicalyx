"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
] as const;

type AppointmentProxyResponse = {
  id?: unknown;
  error?: unknown;
  code?: unknown;
};

function extractResponseError(payload: AppointmentProxyResponse) {
  return typeof payload.error === "string"
    ? payload.error
    : "Unable to schedule appointment";
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);

  return combined.toISOString();
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const [patientID, setPatientID] = useState("");
  const [doctorID, setDoctorID] = useState("");
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedDate = useMemo(() => {
    return appointmentDate ? format(appointmentDate, "PPP") : "Select appointment date";
  }, [appointmentDate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!appointmentDate) {
      setErrorMessage("Select an appointment date before confirming.");
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: patientID.trim(),
          doctor_id: doctorID.trim(),
          start_time: combineDateAndTime(appointmentDate, startTime),
          end_time: combineDateAndTime(appointmentDate, endTime),
        }),
      });

      const payload = (await response.json()) as AppointmentProxyResponse;

      if (!response.ok) {
        const isOverlap = payload.code === "domain.ErrDoctorNotAvailable";
        setErrorMessage(
          isOverlap
            ? "This doctor already has an appointment in the selected time range. Choose another slot."
            : extractResponseError(payload)
        );
        return;
      }

      router.push("/dashboard/appointments");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected scheduling error";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartTimeChange(value: string | null) {
    if (value) {
      setStartTime(value);
    }
  }

  function handleEndTimeChange(value: string | null) {
    if (value) {
      setEndTime(value);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-emerald-500">
          Appointment workflow
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Schedule New Appointment
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a protected appointment slot for a patient and assigned doctor.
        </p>
      </div>

      <Card className="border-border bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Appointment details</CardTitle>
          <CardDescription>
            Use UUIDs for the MVP. Patient search and doctor directory will replace these fields later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="patient-id">Patient ID</Label>
                <Input
                  id="patient-id"
                  required
                  value={patientID}
                  onChange={(event) => setPatientID(event.target.value)}
                  placeholder="Patient UUID"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor-id">Doctor ID</Label>
                <Input
                  id="doctor-id"
                  required
                  value={doctorID}
                  onChange={(event) => setDoctorID(event.target.value)}
                  placeholder="Doctor UUID"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label>Appointment date</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start rounded-xl text-left font-normal",
                          !appointmentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4 text-emerald-500" aria-hidden="true" />
                        {formattedDate}
                      </Button>
                    }
                  />
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={setAppointmentDate}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Start time</Label>
                <Select value={startTime} onValueChange={handleStartTimeChange}>
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>End time</Label>
                <Select value={endTime} onValueChange={handleEndTimeChange}>
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-xl"
                onClick={() => router.push("/dashboard/appointments")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-emerald-500 px-5 font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Appointment"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
