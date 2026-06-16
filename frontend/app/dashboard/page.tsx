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
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-emerald-500">
            Clinic overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, Dr. Smith
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Here is what is happening in your clinic today.
          </p>
        </div>

        <Button className="h-10 rounded-xl bg-emerald-500 px-4 font-semibold text-emerald-950 shadow-sm shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-500/30 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50">
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
                  className="size-5 text-slate-400 transition-colors duration-200 group-hover:text-emerald-500"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-6 flex items-end gap-2">
                <p className="text-4xl font-bold tracking-tight text-slate-900">
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

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-sm shadow-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp
                className="size-5 text-emerald-500"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming Appointments
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-emerald-500 transition-colors hover:bg-emerald-500/5 hover:text-emerald-600"
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
              {upcomingAppointments.map((appointment) => (
                <tr
                  key={`${appointment.time}-${appointment.patient}`}
                  className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50/60"
                >
                  <td className="px-6 py-5 text-xs font-semibold text-emerald-500">
                    {appointment.time}
                  </td>
                  <td className="px-6 py-5 font-medium text-slate-900">
                    {appointment.patient}
                  </td>
                  <td className="px-6 py-5 text-slate-500">
                    {appointment.doctor}
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-500">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
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
