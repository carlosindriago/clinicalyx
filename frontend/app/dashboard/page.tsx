import {
  CalendarDays,
  ChevronDown,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const metrics = [
  {
    label: "Citas Hoy",
    value: "12",
    detail: "+2 desde ayer",
    icon: CalendarDays,
  },
  {
    label: "Nuevos Pacientes",
    value: "4",
    detail: "Esta semana",
    icon: UsersRound,
  },
  {
    label: "Estado del Sistema",
    value: "Encriptado",
    detail: "RLS activo",
    icon: ShieldCheck,
  },
] as const;

const monthlyData = [
  { day: "01", pacientes: 12 },
  { day: "05", pacientes: 18 },
  { day: "09", pacientes: 15 },
  { day: "13", pacientes: 24 },
  { day: "17", pacientes: 22 },
  { day: "21", pacientes: 28 },
  { day: "25", pacientes: 32 },
  { day: "30", pacientes: 26 },
];

type AppointmentStatus = "Programado" | "En progreso";

type StatusStyle = {
  className: string;
  dot: string;
};

const statusStyles: Record<AppointmentStatus, StatusStyle> = {
  Programado: {
    className:
      "border border-teal-200/80 bg-teal-50/90 text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)] dark:border-teal-900/70 dark:bg-teal-950/60 dark:text-teal-300",
    dot: "bg-teal-400 dark:bg-teal-300",
  },
  "En progreso": {
    className:
      "border border-sky-200/80 bg-sky-50/90 text-sky-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)] dark:border-sky-900/70 dark:bg-sky-950/60 dark:text-sky-300",
    dot: "bg-sky-400 dark:bg-sky-300",
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
    status: "Programado",
  },
  {
    time: "10:15 AM",
    patient: "Alice Williams",
    doctor: "Dr. Smith",
    status: "Programado",
  },
  {
    time: "11:00 AM",
    patient: "Robert Taylor",
    doctor: "Dr. Sarah L.",
    status: "En progreso",
  },
  {
    time: "01:30 PM",
    patient: "Elena Martinez",
    doctor: "Dr. Smith",
    status: "Programado",
  },
];

const fallbackStatus: StatusStyle = {
  className:
    "border border-slate-200/80 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  dot: "bg-slate-500",
};



export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <section className="grid gap-6 xl:grid-cols-12">
        <article className="col-span-full overflow-hidden rounded-[34px] border border-white/60 bg-white/60 p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),18px_20px_40px_rgba(123,185,197,0.2),-12px_-12px_28px_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/45 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),18px_20px_38px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700 dark:text-teal-300">
                  Resumen de la Clínica
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 xl:text-[2.35rem]">
                  ¡Bienvenido de nuevo, Dr. Smith!
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Aquí está lo que está sucediendo en tu clínica hoy.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="rounded-full border border-white/60 bg-white/72 px-4 py-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_16px_rgba(130,188,198,0.14)] dark:border-white/8 dark:bg-slate-900/55">
                  Atención coordinada
                </span>
                <span className="rounded-full border border-white/60 bg-white/72 px-4 py-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_16px_rgba(130,188,198,0.14)] dark:border-white/8 dark:bg-slate-900/55">
                  Flujo clínico activo
                </span>
                <span className="rounded-full border border-white/60 bg-white/72 px-4 py-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_16px_rgba(130,188,198,0.14)] dark:border-white/8 dark:bg-slate-900/55">
                  Métricas en tiempo real
                </span>
              </div>
            </div>

            <Button className="h-12 rounded-[22px] bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.25),12px_14px_28px_rgba(36,169,186,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 dark:bg-[linear-gradient(145deg,#18bdbb,#127e98)]">
              + Nueva Cita
            </Button>
          </div>
        </article>

        <div className="col-span-full grid gap-5 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                key={metric.label}
                className="group rounded-[30px] border border-white/60 bg-white/62 p-6 text-slate-900 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),16px_18px_34px_rgba(124,187,198,0.18),-10px_-10px_22px_rgba(255,255,255,0.7)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 dark:border-white/8 dark:bg-slate-950/45 dark:text-slate-100 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),16px_18px_30px_rgba(0,0,0,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <div className="flex size-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#f8ffff,#d5f8f5)] text-teal-600 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_18px_rgba(130,188,198,0.14)] dark:bg-slate-900/80 dark:text-teal-300 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.22)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="mt-8 flex items-end gap-2">
                  <p className="text-[2.15rem] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {metric.value}
                  </p>
                  <p className="pb-1 text-xs font-semibold text-teal-500 dark:text-teal-300">
                    {metric.detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <article className="col-span-full rounded-[34px] border border-white/60 bg-white/60 p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),18px_20px_40px_rgba(123,185,197,0.2),-12px_-12px_28px_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/45 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),18px_20px_38px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Actividad de Pacientes
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Panorama mensual
              </h2>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-[18px] border border-white/60 bg-white/78 px-4 text-sm font-medium text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_18px_rgba(130,188,198,0.16)] dark:border-white/8 dark:bg-slate-900/60 dark:text-teal-300"
            >
              Oct
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(233,252,251,0.96)_100%)] p-5 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),10px_12px_28px rgba(130,188,198,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84)_0%,rgba(9,18,31,0.92)_100%)] dark:shadow-[inset_1px_1px_0 rgba(255,255,255,0.04),10px_12px_24px rgba(0,0,0,0.24)]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "rgba(255, 255, 255, 0.92)",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                    padding: "12px 16px",
                  }}
                  formatter={(value) => [`${value} pacientes`, "Actividad"]}
                  labelFormatter={(label) => `Día ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="pacientes"
                  stroke="#0d9488"
                  strokeWidth={3}
                  fill="url(#colorPacientes)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-[34px] border border-white/60 bg-white/62 text-slate-900 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),18px_20px_40px_rgba(123,185,197,0.2),-12px_-12px_28px_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/45 dark:text-slate-100 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),18px_20px_38px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between border-b border-white/50 px-6 py-5 dark:border-white/8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#f8ffff,#d5f8f5)] text-teal-600 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_18px_rgba(130,188,198,0.14)] dark:bg-slate-900/80 dark:text-teal-300 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.22)]">
              <TrendingUp className="size-5" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Próximas Citas
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 rounded-[18px] border border-white/60 bg-white/78 px-4 text-sm font-medium text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_18px_rgba(130,188,198,0.16)] hover:bg-white/90 hover:text-teal-800 dark:border-white/8 dark:bg-slate-900/60 dark:text-teal-300 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.22)] dark:hover:bg-slate-900/80 dark:hover:text-teal-200"
          >
            Ver todo
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-white/55 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-900/30 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Hora</th>
                <th className="px-6 py-4 font-medium">Nombre del Paciente</th>
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {upcomingAppointments.map((appointment) => {
                const status = statusStyles[appointment.status] ?? fallbackStatus;

                return (
                  <tr
                    key={`${appointment.time}-${appointment.patient}`}
                    className="border-t border-white/45 transition-colors duration-150 hover:bg-white/35 dark:border-white/8 dark:hover:bg-slate-900/24"
                  >
                    <td className="px-6 py-5 text-sm font-semibold text-teal-600 dark:text-teal-300">
                      {appointment.time}
                    </td>
                    <td className="px-6 py-5 font-medium text-teal-700 dark:text-teal-200">
                      {appointment.patient}
                    </td>
                    <td className="px-6 py-5 text-slate-500 dark:text-slate-400">
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
