import { CalendarDays, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const metrics = [
  {
    label: "Appointments today",
    value: "12",
    detail: "+2 from yesterday",
    icon: CalendarDays,
  },
  {
    label: "New patients",
    value: "4",
    detail: "This week",
    icon: UsersRound,
  },
  {
    label: "System status",
    value: "Encrypted",
    detail: "RLS active",
    icon: ShieldCheck,
  },
] as const;

type AppointmentStatus = "Scheduled" | "In progress" | "Cancelled";

type StatusStyle = {
  className: string;
  dot: string;
};

const statusStyles: Record<AppointmentStatus, StatusStyle> = {
  Scheduled: {
    className: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  "In progress": {
    className: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  Cancelled: {
    className: "bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

const upcomingAppointments: Array<{
  time: string;
  patient: string;
  doctor: string;
  status: AppointmentStatus;
}> = [
  {
    time: "09:30 AM",
    patient: "Jonathan Smith",
    doctor: "Dr. Smith",
    status: "Scheduled",
  },
  {
    time: "10:15 AM",
    patient: "Alice Williams",
    doctor: "Dr. Smith",
    status: "Scheduled",
  },
  {
    time: "11:00 AM",
    patient: "Robert Taylor",
    doctor: "Dr. Sarah L.",
    status: "In progress",
  },
  {
    time: "01:30 PM",
    patient: "Elena Martinez",
    doctor: "Dr. Smith",
    status: "Scheduled",
  },
];

const fallbackStatus: StatusStyle = {
  className: "bg-slate-100 text-slate-700",
  dot: "bg-slate-500",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-teal-600">
            Clinic overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, Dr. Smith
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Here is what is happening in your clinic today.
          </p>
        </div>

        <Button className="h-10 rounded-xl bg-teal-600 px-4 font-semibold text-white shadow-sm shadow-teal-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-600/35 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50">
          + New Appointment
        </Button>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-900 shadow-sm shadow-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.08]"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {metric.label}
                </p>
                <Icon
                  className="size-5 text-slate-400 transition-colors duration-200 group-hover:text-teal-600"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-6 flex items-end gap-2">
                <p className="text-4xl font-bold tracking-tight text-slate-900">
                  {metric.value}
                </p>
                <p className="pb-1 text-xs font-medium text-emerald-600">
                  {metric.detail}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-sm shadow-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50">
              <TrendingUp className="size-5 text-teal-600" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming Appointments
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-teal-600 transition-colors hover:bg-teal-50 hover:text-teal-700"
          >
            View all
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Patient name</th>
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingAppointments.map((appointment) => {
                const status = statusStyles[appointment.status] ?? fallbackStatus;

                return (
                  <tr
                    key={`${appointment.time}-${appointment.patient}`}
                    className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-5 text-xs font-semibold text-teal-600">
                      {appointment.time}
                    </td>
                    <td className="px-6 py-5 font-medium text-slate-900">
                      {appointment.patient}
                    </td>
                    <td className="px-6 py-5 text-slate-500">
                      {appointment.doctor}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider",
                          status.className
                        )}
                      >
                        <span
                          className={cn("size-1.5 rounded-full", status.dot)}
                        />
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
