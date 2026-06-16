import {
  Activity,
  CalendarDays,
  ChevronDown,
  Pill,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";

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

const activityData = [34, 48, 41, 64, 59, 76, 68, 88];

const activityLabels = ["01", "05", "09", "13", "17", "21", "25", "30"];

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

function getActivityPoints() {
  const width = 100;
  const height = 100;
  const maxValue = Math.max(...activityData);
  const minValue = Math.min(...activityData);
  const range = maxValue - minValue || 1;

  return activityData.map((value, index) => {
    const x = (index / (activityData.length - 1)) * width;
    const y = height - ((value - minValue) / range) * 72 - 14;

    return { x, y };
  });
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>) {
  const line = buildLinePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return `${line} L ${lastPoint.x} 100 L ${firstPoint.x} 100 Z`;
}

export default function DashboardPage() {
  const chartPoints = getActivityPoints();
  const linePath = buildLinePath(chartPoints);
  const areaPath = buildAreaPath(chartPoints);

  return (
    <div className="space-y-7">
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <article className="overflow-hidden rounded-[34px] border border-white/60 bg-white/60 p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),18px_20px_40px_rgba(123,185,197,0.2),-12px_-12px_28px_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/45 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),18px_20px_38px_rgba(0,0,0,0.28)]">
          <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:items-center">
            <div className="relative flex min-h-[220px] items-end justify-center rounded-[28px] bg-[radial-gradient(circle_at_top,#f7ffff_0%,#d7f9f7_38%,#c3f2f2_100%)] p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.96),10px_12px_26px_rgba(111,181,191,0.2)] dark:bg-[radial-gradient(circle_at_top,#12314f_0%,#10263d_48%,#0a1929_100%)] dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),12px_14px_28px_rgba(0,0,0,0.24)]">
              <div className="absolute right-5 top-5 flex size-14 items-center justify-center rounded-[18px] bg-white/70 text-teal-600 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_18px_rgba(120,189,197,0.2)] dark:bg-slate-900/60 dark:text-teal-300">
                <Pill className="size-6" aria-hidden="true" />
              </div>
              <div className="relative flex items-end gap-5">
                <div className="relative h-32 w-20 rounded-t-[34px] rounded-b-[26px] bg-[#29c7c7] shadow-[inset_1px_1px_0_rgba(255,255,255,0.45),10px_12px_18px_rgba(86,165,180,0.18)]">
                  <div className="absolute left-1/2 top-[-3.25rem] h-16 w-16 -translate-x-1/2 rounded-full bg-[#ffd6c3]" />
                  <div className="absolute left-1/2 top-[-2.2rem] h-8 w-14 -translate-x-1/2 rounded-t-full bg-[#0f3c64]" />
                  <div className="absolute left-[-0.9rem] top-9 h-14 w-6 rotate-[18deg] rounded-full bg-[#29c7c7]" />
                  <div className="absolute right-[-0.7rem] top-10 h-14 w-6 -rotate-[24deg] rounded-full bg-[#29c7c7]" />
                </div>
                <div className="mb-3 flex h-24 w-28 items-center justify-center rounded-[24px] border border-white/60 bg-white/82 text-teal-600 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_18px_rgba(120,189,197,0.2)] dark:border-white/8 dark:bg-slate-900/72 dark:text-teal-300">
                  <Activity className="size-10" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700 dark:text-teal-300">
                  Resumen de la Clínica
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 xl:text-[2.5rem]">
                  ¡Bienvenido de nuevo, Dr. Smith!
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Aquí está lo que está sucediendo en tu clínica hoy.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="rounded-full border border-white/60 bg-white/72 px-4 py-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_16px_rgba(130,188,198,0.14)] dark:border-white/8 dark:bg-slate-900/55">
                    Atención coordinada
                  </span>
                  <span className="rounded-full border border-white/60 bg-white/72 px-4 py-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_16px_rgba(130,188,198,0.14)] dark:border-white/8 dark:bg-slate-900/55">
                    Flujo clínico activo
                  </span>
                </div>

                <Button className="h-12 rounded-[22px] bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.25),12px_14px_28px_rgba(36,169,186,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 dark:bg-[linear-gradient(145deg,#18bdbb,#127e98)]">
                  + Nueva Cita
                </Button>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[34px] border border-white/60 bg-white/60 p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),18px_20px_40px_rgba(123,185,197,0.2),-12px_-12px_28px_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/45 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),18px_20px_38px_rgba(0,0,0,0.28)]">
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

          <div className="mt-6 h-[280px] rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(233,252,251,0.96)_100%)] p-5 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),10px_12px_28px_rgba(130,188,198,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84)_0%,rgba(9,18,31,0.92)_100%)] dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),10px_12px_24px_rgba(0,0,0,0.24)]">
            <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none" aria-label="Gráfico de actividad de pacientes">
              <defs>
                <linearGradient id="activity-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(43,205,199,0.42)" />
                  <stop offset="100%" stopColor="rgba(43,205,199,0.03)" />
                </linearGradient>
              </defs>

              {[20, 40, 60, 80].map((gridY) => (
                <line
                  key={gridY}
                  x1="0"
                  x2="100"
                  y1={gridY}
                  y2={gridY}
                  stroke="rgba(148,163,184,0.16)"
                  strokeDasharray="2 3"
                />
              ))}

              <path d={areaPath} fill="url(#activity-fill)" />
              <path
                d={linePath}
                fill="none"
                stroke="#23c9c4"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {chartPoints.map((point) => (
                <circle
                  key={`${point.x}-${point.y}`}
                  cx={point.x}
                  cy={point.y}
                  r="2.6"
                  fill="#ffffff"
                  stroke="#23c9c4"
                  strokeWidth="2"
                />
              ))}
            </svg>

            <div className="mt-4 grid grid-cols-8 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              {activityLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
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
