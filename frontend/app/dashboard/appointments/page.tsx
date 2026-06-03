import Link from "next/link";
import { Plus } from "lucide-react";

import {
  AppointmentsTable,
  type AppointmentRow,
} from "@/components/appointments-table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dailyAppointments: AppointmentRow[] = [
  {
    id: "6f4e3c1e-5ef7-4a77-bb60-44c8347c6011",
    time: "09:00 AM",
    duration: "45 mins",
    patient: "Alice Walker",
    initials: "AW",
    doctor: "Dr. Smith",
    type: "Annual Checkup",
    status: "Confirmed",
  },
  {
    id: "223ac633-995f-4c54-a510-7335428bc1f3",
    time: "10:30 AM",
    duration: "30 mins",
    patient: "James Miller",
    initials: "JM",
    doctor: "Dr. Sarah Chen",
    type: "Cardiology Follow-up",
    status: "Pending",
  },
  {
    id: "83fa9f65-4f74-4f08-b034-fd218ef8a078",
    time: "01:15 PM",
    duration: "60 mins",
    patient: "Robert King",
    initials: "RK",
    doctor: "Dr. Smith",
    type: "Pre-op Consultation",
    status: "Confirmed",
  },
  {
    id: "d57a7bda-e90b-44d5-9fdb-d6249ab1361f",
    time: "02:30 PM",
    duration: "20 mins",
    patient: "Elena Hernandez",
    initials: "EH",
    doctor: "Dr. Marcus Thorne",
    type: "Dermatology Screen",
    status: "Cancelled",
  },
];

export default function AppointmentsPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-emerald-500">
            Daily schedule
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Daily Appointments
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Managing 14 consultations for today.
          </p>
        </div>

        <Link
          href="/dashboard/appointments/new"
          className={cn(
            buttonVariants(),
            "h-11 rounded-xl bg-emerald-500 px-4 font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400"
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          Schedule New Appointment
        </Link>
      </section>

      <AppointmentsTable appointments={dailyAppointments} />
    </div>
  );
}
