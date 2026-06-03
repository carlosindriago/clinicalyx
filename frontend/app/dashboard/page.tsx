import { CalendarDays, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";

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

const upcomingAppointments = [
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
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-emerald-500">
            Clinic overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, Dr. Smith
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Here is what is happening in your clinic today.
          </p>
        </div>

        <Button className="h-10 rounded-xl bg-emerald-500 px-4 font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400">
          + New Appointment
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition hover:border-emerald-500/30"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {metric.label}
                </p>
                <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="mt-6 flex items-end gap-2">
                <p className="text-4xl font-bold tracking-tight text-foreground">
                  {metric.value}
                </p>
                <p className="pb-1 text-xs font-semibold text-emerald-500">
                  {metric.detail}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-5 text-emerald-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-emerald-400">
            View all
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-muted/60 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Patient name</th>
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingAppointments.map((appointment) => (
                <tr key={`${appointment.time}-${appointment.patient}`} className="border-t border-border">
                  <td className="px-6 py-5 font-mono text-xs font-semibold text-emerald-500">
                    {appointment.time}
                  </td>
                  <td className="px-6 py-5 font-medium text-foreground">
                    {appointment.patient}
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">
                    {appointment.doctor}
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-emerald-500">
                      {appointment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
