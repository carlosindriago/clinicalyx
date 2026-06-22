"use client";

import { useEffect, useState } from "react";
import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";

import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Circle,
  ClipboardList,
  FileText,
  Stethoscope,
  TrendingUp,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  KpiSparkline,
  type KpiSparklineTone,
} from "@/components/kpi-sparkline";
import { cn } from "@/lib/utils";

type AppointmentStatus = "Programado" | "En progreso";

type StatusStyle = {
  className: string;
  dot: string;
};

type SparklineTone = KpiSparklineTone;

type MetricContextItem = {
  label: string;
  value: string;
};

type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  trend?: number[];
  tone?: SparklineTone;
  context?: MetricContextItem[];
};

type DemoRole = "doctor" | "receptionist" | "admin";

type DemoSandboxState = {
  currentRole?: DemoRole;
};

type WorklistTone = "teal" | "sky" | "slate";

type HeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
  ctaLabel: string;
  ctaHref: string;
};

type RoleChartPoint = {
  label: string;
  value: number;
};

type RoleChartConfig = {
  eyebrow: string;
  title: string;
  rangeLabel: string;
  seriesLabel: string;
  data: RoleChartPoint[];
};

type WorklistItem = {
  id: string;
  primary: string;
  secondary: string;
  owner: string;
  status: string;
  tone: WorklistTone;
};

type RoleWorklistConfig = {
  title: string;
  actionLabel: string;
  primaryHeader: string;
  ownerHeader: string;
  items: WorklistItem[];
};

type RoleWidget = {
  title: string;
  description: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  href: string;
};

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const badgeStyles: Record<WorklistTone, StatusStyle> = {
  teal: {
    className:
      "border border-teal-200/80 bg-teal-50/90 text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)] dark:border-teal-900/70 dark:bg-teal-950/60 dark:text-teal-400",
    dot: "bg-teal-400 dark:bg-teal-300",
  },
  sky: {
    className:
      "border border-sky-200/80 bg-sky-50/90 text-sky-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)] dark:border-sky-900/70 dark:bg-sky-950/60 dark:text-sky-300",
    dot: "bg-sky-400 dark:bg-sky-300",
  },
  slate: {
    className:
      "border border-slate-200/80 bg-slate-100/90 text-slate-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.82)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-500 dark:bg-slate-400",
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

const DEMO_STORAGE_KEY = "clinicalyx_demo_sandbox";

const HERO_CONTENT_BY_ROLE: Record<DemoRole, HeroContent> = {
  doctor: {
    eyebrow: "Resumen Clinico",
    title: "Tu jornada medica esta bajo control.",
    description:
      "Prioriza pacientes, consultas activas y seguimiento clinico con una vista enfocada en atencion y continuidad.",
    tags: ["Agenda priorizada", "Seguimiento activo", "Metricas clinicas"],
    ctaLabel: "+ Nueva Cita",
    ctaHref: "/dashboard/appointments/new",
  },
  receptionist: {
    eyebrow: "Centro de Recepcion",
    title: "Gestiona agenda, llegadas y confirmaciones.",
    description:
      "Accede rapido a los movimientos del turno para coordinar ingresos, registrar pacientes y mantener la recepcion fluida.",
    tags: ["Check-ins del turno", "Agenda coordinada", "Recepcion en tiempo real"],
    ctaLabel: "+ Registrar llegada",
    ctaHref: "/dashboard/patients/new",
  },
  admin: {
    eyebrow: "Panel Ejecutivo",
    title: "Supervisa operacion, demanda y rendimiento.",
    description:
      "Toma decisiones con una vista orientada a ocupacion, productividad y crecimiento de la clinica.",
    tags: ["Ocupacion operativa", "Rendimiento del turno", "Vision ejecutiva"],
    ctaLabel: "+ Ver reportes",
    ctaHref: "/dashboard",
  },
};

/**
 * Acciones rápidas por rol. Migradas desde la barra intermedia
 * del DashboardShell (que se eliminó para combatir la "fatiga de
 * encabezados"). Se renderizan dentro del hero card, debajo del
 * CTA principal, con estilo secundario/ghost para no competir
 * visualmente con la llamada a la acción primaria.
 *
 * El doctor mantiene los dos destinos más comunes (agenda +
 * pacientes). El recepcionista enfoca admisiones + agenda. El
 * admin enfoca supervision + reportes.
 */
const QUICK_ACTIONS_BY_ROLE: Record<DemoRole, QuickAction[]> = {
  doctor: [
    {
      label: "Agenda de hoy",
      href: "/dashboard/appointments",
      icon: CalendarDays,
    },
    { label: "Pacientes", href: "/dashboard/patients", icon: UsersRound },
  ],
  receptionist: [
    {
      label: "Nuevo paciente",
      href: "/dashboard/patients/new",
      icon: UserPlus,
    },
    {
      label: "Turno actual",
      href: "/dashboard/appointments",
      icon: ClipboardList,
    },
  ],
  admin: [
    {
      label: "Operacion",
      href: "/dashboard/appointments",
      icon: ClipboardList,
    },
    { label: "Metricas", href: "/dashboard", icon: BarChart3 },
  ],
};

function isDemoRole(value: unknown): value is DemoRole {
  return (
    value === "doctor" || value === "receptionist" || value === "admin"
  );
}

function buildMetricsByRole({
  role,
  pendingAppointments,
  activeAppointments,
  totalAppointments,
}: {
  role: DemoRole;
  pendingAppointments: number;
  activeAppointments: number;
  totalAppointments: number;
}): DashboardMetric[] {
  if (role === "receptionist") {
    return [
      {
        label: "Check-ins Hoy",
        value: "9",
        detail: "+3 en la ultima hora",
        icon: CalendarDays,
        trend: [4, 5, 5, 6, 7, 8, 9],
        tone: "teal",
      },
      {
        label: "Nuevos Registros",
        value: "6",
        detail: "Esta semana",
        icon: UsersRound,
        trend: [2, 2, 3, 4, 4, 5, 6],
        tone: "sky",
      },
      {
        label: "Confirmaciones Pendientes",
        value: String(pendingAppointments + 2),
        detail: "Llamadas por cerrar",
        icon: Activity,
        context: [
          { label: "En sala", value: String(activeAppointments) },
          { label: "Agenda hoy", value: String(totalAppointments) },
        ],
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        label: "Ocupacion Agenda",
        value: "86%",
        detail: "+4% esta semana",
        icon: CalendarDays,
        trend: [74, 76, 77, 81, 82, 84, 86],
        tone: "teal",
      },
      {
        label: "Nuevos Pacientes",
        value: "18",
        detail: "Este mes",
        icon: UsersRound,
        trend: [5, 7, 9, 11, 13, 15, 18],
        tone: "sky",
      },
      {
        label: "Productividad Clinica",
        value: "94%",
        detail: "Rendimiento del turno",
        icon: Activity,
        context: [
          { label: "No-show", value: "2" },
          { label: "Atendidas", value: String(totalAppointments - 1) },
        ],
      },
    ];
  }

  return [
    {
      label: "Citas Hoy",
      value: "12",
      detail: "+2 desde ayer",
      icon: CalendarDays,
      trend: [7, 8, 8, 9, 10, 11, 12],
      tone: "teal",
    },
    {
      label: "Nuevos Pacientes",
      value: "4",
      detail: "Esta semana",
      icon: UsersRound,
      trend: [1, 1, 2, 2, 3, 3, 4],
      tone: "sky",
    },
    {
      label: "Pacientes por Atender",
      value: String(pendingAppointments),
      detail: "Pendientes en agenda",
      icon: Activity,
      context: [
        { label: "En progreso", value: String(activeAppointments) },
        { label: "Total hoy", value: String(totalAppointments) },
      ],
    },
  ];
}

function buildChartByRole(role: DemoRole): RoleChartConfig {
  if (role === "receptionist") {
    return {
      eyebrow: "Movimiento de Recepcion",
      title: "Check-ins por franja",
      rangeLabel: "Turno",
      seriesLabel: "Check-ins",
      data: [
        { label: "08h", value: 3 },
        { label: "09h", value: 5 },
        { label: "10h", value: 4 },
        { label: "11h", value: 6 },
        { label: "12h", value: 7 },
        { label: "13h", value: 5 },
        { label: "14h", value: 8 },
      ],
    };
  }

  if (role === "admin") {
    return {
      eyebrow: "Rendimiento Operativo",
      title: "Ocupacion semanal de la clinica",
      rangeLabel: "Mes",
      seriesLabel: "Ocupacion",
      data: [
        { label: "S1", value: 72 },
        { label: "S2", value: 78 },
        { label: "S3", value: 83 },
        { label: "S4", value: 86 },
      ],
    };
  }

  return {
    eyebrow: "Actividad de Pacientes",
    title: "Panorama mensual",
    rangeLabel: "Oct",
    seriesLabel: "Pacientes",
    data: [
      { label: "01", value: 12 },
      { label: "05", value: 18 },
      { label: "09", value: 15 },
      { label: "13", value: 24 },
      { label: "17", value: 22 },
      { label: "21", value: 28 },
      { label: "25", value: 32 },
      { label: "30", value: 26 },
    ],
  };
}

function buildWorklistByRole(role: DemoRole): RoleWorklistConfig {
  if (role === "receptionist") {
    return {
      title: "Recepcion del Turno",
      actionLabel: "Ver recepcion",
      primaryHeader: "Movimiento",
      ownerHeader: "Responsable",
      items: [
        {
          id: "reception-1",
          primary: "08:40 AM",
          secondary: "Llegada confirmada de Maria Lopez",
          owner: "Mostrador A",
          status: "Check-in",
          tone: "teal",
        },
        {
          id: "reception-2",
          primary: "09:05 AM",
          secondary: "Llamada pendiente a Jonathan Smith",
          owner: "Mostrador B",
          status: "Pendiente",
          tone: "slate",
        },
        {
          id: "reception-3",
          primary: "09:30 AM",
          secondary: "Documentacion lista para Elena Martinez",
          owner: "Admisiones",
          status: "En sala",
          tone: "sky",
        },
        {
          id: "reception-4",
          primary: "10:00 AM",
          secondary: "Pre-registro completado de Ana Torres",
          owner: "Mostrador A",
          status: "Validado",
          tone: "teal",
        },
      ],
    };
  }

  if (role === "admin") {
    return {
      title: "Operaciones Prioritarias",
      actionLabel: "Ver panel",
      primaryHeader: "Indicador",
      ownerHeader: "Area",
      items: [
        {
          id: "admin-1",
          primary: "No-show del turno",
          secondary: "2 citas sin asistencia en la manana",
          owner: "Recepcion",
          status: "Revisar",
          tone: "slate",
        },
        {
          id: "admin-2",
          primary: "Capacidad de agenda",
          secondary: "Cardiologia supera el 90% de ocupacion",
          owner: "Consultorios",
          status: "Alto",
          tone: "sky",
        },
        {
          id: "admin-3",
          primary: "Facturacion diaria",
          secondary: "Meta del turno cubierta al 94%",
          owner: "Caja",
          status: "Estable",
          tone: "teal",
        },
        {
          id: "admin-4",
          primary: "Satisfaccion operativa",
          secondary: "Tiempo promedio de espera bajo objetivo",
          owner: "Experiencia",
          status: "Optimo",
          tone: "teal",
        },
      ],
    };
  }

  return {
    title: "Proximas Citas",
    actionLabel: "Ver agenda",
    primaryHeader: "Cita",
    ownerHeader: "Doctor",
    items: upcomingAppointments.map((appointment) => ({
      id: `${appointment.time}-${appointment.patient}`,
      primary: appointment.time,
      secondary: appointment.patient,
      owner: appointment.doctor,
      status: appointment.status,
      tone: appointment.status === "En progreso" ? "sky" : "teal",
    })),
  };
}

function buildWidgetsByRole(role: DemoRole): RoleWidget[] {
  if (role === "receptionist") {
    return [
      {
        title: "Registro Express",
        description: "Alta rapida para pacientes con datos minimos del turno.",
        value: "02 min",
        detail: "Tiempo medio de admision",
        icon: UserPlus,
        href: "/dashboard/patients/new",
      },
      {
        title: "Agenda Viva",
        description: "Revisa huecos libres y reacomoda citas sin salir del turno.",
        value: "3 huecos",
        detail: "Disponibles esta tarde",
        icon: ClipboardList,
        href: "/dashboard/appointments",
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        title: "Pulso Operativo",
        description: "Concentra ocupacion, asistencia y rendimiento por area.",
        value: "94%",
        detail: "Productividad del turno",
        icon: BarChart3,
        href: "/dashboard",
      },
      {
        title: "Capacidad Clinica",
        description: "Detecta consultorios tensionados antes de afectar la agenda.",
        value: "2 areas",
        detail: "Por encima del 90%",
        icon: Activity,
        href: "/dashboard/appointments",
      },
    ];
  }

  return [
    {
      title: "Consultas Activas",
      description: "Retoma rapido los casos en curso y su evolucion del dia.",
      value: "5 casos",
      detail: "Seguimiento prioritario",
      icon: Stethoscope,
      href: "/dashboard/clinical-records",
    },
    {
      title: "Notas Clinicas",
      description: "Continua registros, indicaciones y observaciones del turno.",
      value: "12 notas",
      detail: "Actualizadas hoy",
      icon: FileText,
      href: "/dashboard/clinical-records",
    },
  ];
}

function getAvatarLabel(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Factory: produce a Recharts Tooltip component that adapts to the
 * current theme. Returns a stable component per (rangeLabel, seriesLabel)
 * pair so the Tooltip body uses Tailwind dark: variants instead of the
 * Recharts default which always paints white-on-white. The previous
 * version hardcoded backgroundColor: "rgba(255, 255, 255, 0.92)" and
 * did not set a `color` property, so the text inherited currentColor
 * from the dark parent (slate-100) and became invisible.
 */
function buildChartTooltip(rangeLabel: string, seriesLabel: string) {
  function ChartTooltip({
    active,
    payload,
    label,
  }: TooltipContentProps<number, string>) {
    if (!active || !payload?.length) {
      return null;
    }

    const firstPayload = payload[0];
    const value = firstPayload?.value;

    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {rangeLabel} {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-teal-600 dark:text-teal-400">
          {String(value)} {seriesLabel}
        </p>
      </div>
    );
  }

  return ChartTooltip;
}

export default function DashboardPage() {
  const [currentRole, setCurrentRole] = useState<DemoRole>("doctor");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const syncRoleFromStorage = () => {
      try {
        const storedSandbox = window.localStorage.getItem(DEMO_STORAGE_KEY);

        if (!storedSandbox) {
          setCurrentRole("doctor");
          return;
        }

        const parsedSandbox = JSON.parse(storedSandbox) as DemoSandboxState;

        if (isDemoRole(parsedSandbox.currentRole)) {
          setCurrentRole(parsedSandbox.currentRole);
        }
      } catch {
        setCurrentRole("doctor");
      }
    };

    syncRoleFromStorage();
    window.addEventListener("storage", syncRoleFromStorage);
    window.addEventListener("focus", syncRoleFromStorage);

    return () => {
      window.removeEventListener("storage", syncRoleFromStorage);
      window.removeEventListener("focus", syncRoleFromStorage);
    };
  }, []);

  const pendingAppointments = upcomingAppointments.filter(
    (appointment) => appointment.status === "Programado"
  ).length;
  const activeAppointments = upcomingAppointments.filter(
    (appointment) => appointment.status === "En progreso"
  ).length;
  const metrics = buildMetricsByRole({
    role: currentRole,
    pendingAppointments,
    activeAppointments,
    totalAppointments: upcomingAppointments.length,
  });
  const heroContent = HERO_CONTENT_BY_ROLE[currentRole];
  const quickActions = QUICK_ACTIONS_BY_ROLE[currentRole];
  const chartContent = buildChartByRole(currentRole);
  const worklistContent = buildWorklistByRole(currentRole);
  const roleWidgets = buildWidgetsByRole(currentRole);

  return (
    <div className="space-y-7">
      <section className="grid gap-6 xl:grid-cols-12">
        <article className="col-span-full overflow-hidden rounded-[34px] border border-white/60 bg-white/60 p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),18px_20px_40px_rgba(123,185,197,0.2),-12px_-12px_28px_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/45 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),18px_20px_38px_rgba(0,0,0,0.28)]">
          {/*
           * Layout del hero card:
           *   - Stacked vertical (text section + action bar al fondo).
           *   - El action bar se separa del bloque de texto con un
           *     border-top sutil para que los dos grupos visuales
           *     queden claramente delimitados.
           *   - Los tags se renderizan como flat list (sin bg, sin
           *     border, sin shadow) con un pequeño Circle teal a la
           *     izquierda de cada uno. Esto resuelve el problema de
           *     affordance: antes parecían botones clickeables
           *     ("Agenda priorizada", "Seguimiento activo", "Metricas
           *     clinicas") y confundían al usuario. Ahora se leen
           *     claramente como caracteristicas de la plataforma.
           *   - Los 3 botones (2 secundarios + 1 primario) viven en
           *     una sola action bar al fondo, alineados a la derecha.
           *     Los secundarios suben de "ghost translucido" a
           *     "solid secondary" (bg blanco + border + shadow-sm)
           *     para que no se vean desconectados del CTA.
           */}
          <div className="flex flex-col gap-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700 dark:text-teal-400">
                  {heroContent.eyebrow}
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 xl:text-[2.35rem]">
                  {heroContent.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {heroContent.description}
                </p>
              </div>

              <div
                role="list"
                aria-label="Caracteristicas de la plataforma"
                className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400"
              >
                {heroContent.tags.map((tag) => (
                  <span
                    key={tag}
                    role="listitem"
                    className="inline-flex items-center gap-2"
                  >
                    <Circle
                      className="size-3 fill-teal-500 text-teal-500 dark:fill-teal-400 dark:text-teal-400"
                      aria-hidden="true"
                    />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/60 pt-5 dark:border-white/8">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-teal-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_1px_2px_rgba(0,0,0,0.25)] dark:hover:border-white/20 dark:hover:bg-slate-700 dark:hover:text-teal-400"
                  >
                    <Icon
                      className="size-4 text-teal-600 dark:text-teal-400"
                      aria-hidden="true"
                    />
                    <span>{action.label}</span>
                  </Link>
                );
              })}
              <Link
                href={heroContent.ctaHref}
                className="inline-flex h-11 items-center rounded-[18px] bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.25),8px_10px_20px_rgba(36,169,186,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 dark:bg-[linear-gradient(145deg,#18bdbb,#127e98)]"
              >
                {heroContent.ctaLabel}
              </Link>
            </div>
          </div>
        </article>

        <div className="col-span-full grid gap-5 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                key={metric.label}
                className="group flex h-full flex-col rounded-[30px] border border-white/60 bg-white/62 p-6 text-slate-900 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),16px_18px_34px_rgba(124,187,198,0.18),-10px_-10px_22px_rgba(255,255,255,0.7)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 dark:border-white/8 dark:bg-slate-950/45 dark:text-slate-100 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),16px_18px_30px_rgba(0,0,0,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <div className="flex size-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#f8ffff,#d5f8f5)] text-teal-600 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_18px_rgba(130,188,198,0.14)] dark:bg-slate-900/80 dark:text-teal-400 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.22)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="mt-8 flex items-end gap-2">
                  <p className="text-[2.15rem] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {metric.value}
                  </p>
                  <p className="pb-1 text-xs font-semibold text-teal-500 dark:text-teal-400">
                    {metric.detail}
                  </p>
                </div>
                {metric.trend ? (
                  <KpiSparkline
                    data={metric.trend.map((value) => ({ val: value }))}
                    tone={metric.tone ?? "teal"}
                  />
                ) : null}
                {metric.context ? (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {metric.context.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(240,249,255,0.74)_100%)] px-4 py-3 shadow-[inset_1px_1px_0_rgba(255,255,255,0.92),6px_8px_18px_rgba(130,188,198,0.1)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.78)_0%,rgba(8,15,28,0.88)_100%)] dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),6px_8px_16px_rgba(0,0,0,0.24)]"
                      >
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="col-span-full grid gap-5 xl:grid-cols-2">
          {roleWidgets.map((widget) => {
            const Icon = widget.icon;

            return (
              <Link
                key={widget.title}
                href={widget.href}
                className="group rounded-[30px] border border-white/60 bg-white/62 p-6 text-slate-900 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),16px_18px_34px_rgba(124,187,198,0.16),-10px_-10px_22px_rgba(255,255,255,0.7)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/70 dark:border-white/8 dark:bg-slate-950/45 dark:text-slate-100 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),16px_18px_30px_rgba(0,0,0,0.24)] dark:hover:bg-slate-950/58"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {widget.title}
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {widget.description}
                    </p>
                  </div>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#f8ffff,#d5f8f5)] text-teal-600 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_18px_rgba(130,188,198,0.14)] dark:bg-slate-900/80 dark:text-teal-400 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.22)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[2rem] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {widget.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
                      {widget.detail}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-slate-500 transition-colors group-hover:text-teal-700 dark:text-slate-400 dark:group-hover:text-teal-300">
                    Abrir flujo
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <article className="col-span-full rounded-[34px] border border-white/60 bg-white/60 p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),18px_20px_40px_rgba(123,185,197,0.2),-12px_-12px_28px_rgba(255,255,255,0.75)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/45 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),18px_20px_38px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {chartContent.eyebrow}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {chartContent.title}
              </h2>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-[18px] border border-white/60 bg-white/78 px-4 text-sm font-medium text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_18px_rgba(130,188,198,0.16)] dark:border-white/8 dark:bg-slate-900/60 dark:text-teal-400"
            >
              {chartContent.rangeLabel}
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(233,252,251,0.96)_100%)] p-5 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),10px_12px_28px rgba(130,188,198,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84)_0%,rgba(9,18,31,0.92)_100%)] dark:shadow-[inset_1px_1px_0 rgba(255,255,255,0.04),10px_12px_24px rgba(0,0,0,0.24)]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartContent.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "rgba(148, 163, 184, 0.14)" : "#f1f5f9"}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }}
                  width={36}
                />
                {(() => {
                  const ChartTooltip = buildChartTooltip(
                    chartContent.rangeLabel,
                    chartContent.seriesLabel
                  );
                  // Recharts infers Tooltip generics from the payload/data,
                  // not from a manual <number, string> annotation. The cast
                  // below is the documented escape hatch for v3 — the
                  // structural shape of the payload matches what ChartTooltip
                  // expects (TooltipContentProps<number, string>).
                  return (
                    <Tooltip
                      cursor={{
                        stroke: isDark
                          ? "rgba(148, 163, 184, 0.25)"
                          : "rgba(15, 23, 42, 0.12)",
                        strokeWidth: 1,
                      }}
                      content={((props: TooltipContentProps<number, string>) => (
                        <ChartTooltip {...props} />
                      )) as unknown as React.ComponentProps<typeof Tooltip>["content"]}
                    />
                  );
                })()}
                <Area
                  type="monotone"
                  dataKey="value"
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
        <div className="flex items-center justify-between border-b border-white/50 px-4 py-4 dark:border-white/8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#f8ffff,#d5f8f5)] text-teal-600 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_18px_rgba(130,188,198,0.14)] dark:bg-slate-900/80 dark:text-teal-400 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.22)]">
              <TrendingUp className="size-5" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {worklistContent.title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 rounded-[18px] border border-white/60 bg-white/78 px-4 text-sm font-medium text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_18px_rgba(130,188,198,0.16)] hover:bg-white/90 hover:text-teal-800 dark:border-white/8 dark:bg-slate-900/60 dark:text-teal-400 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.22)] dark:hover:bg-slate-900/80 dark:hover:text-teal-200"
          >
            {worklistContent.actionLabel}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-white/55 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-900/30 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">{worklistContent.primaryHeader}</th>
                <th className="px-4 py-3 font-medium">{worklistContent.ownerHeader}</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {worklistContent.items.map((item) => {
                const status = badgeStyles[item.tone] ?? fallbackStatus;

                return (
                  <tr
                    key={item.id}
                    className="border-t border-white/45 transition-colors duration-150 hover:bg-slate-50/70 cursor-pointer dark:border-white/8 dark:hover:bg-slate-900/24"
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                          {item.primary}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {item.secondary}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="mr-2 flex size-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {getAvatarLabel(item.owner)}
                        </div>
                        <span className="text-slate-600 dark:text-slate-300">
                          {item.owner}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider",
                          status.className
                        )}
                      >
                        <span
                          className={cn("size-1.5 rounded-full", status.dot)}
                        />
                        {item.status}
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
