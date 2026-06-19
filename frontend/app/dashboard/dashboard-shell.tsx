"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Menu,
  Search,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Sidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlobalSearch } from "@/components/global-search";
import type { AppRole } from "@/lib/backend";

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Mapeo de role a etiqueta de UI y quick actions. El role viene del JWT
// (verificado por el backend), NO del localStorage. Esto cierra el
// vector donde un usuario podía setear localStorage a "admin" para
// ver UI privilegiada.
const ROLE_SHELL_LABELS: Record<AppRole, string> = {
  SUPERADMIN: "Vista Ejecutiva",
  DOCTOR: "Vista Clinica",
  NURSE: "Vista Enfermeria",
  RECEPTIONIST: "Vista Recepcion",
};

const HEADER_ACTIONS_BY_ROLE: Record<AppRole, QuickAction[]> = {
  SUPERADMIN: [
    { label: "Operacion", href: "/dashboard/appointments", icon: ClipboardList },
    { label: "Metricas", href: "/dashboard", icon: BarChart3 },
  ],
  DOCTOR: [
    { label: "Agenda de hoy", href: "/dashboard/appointments", icon: CalendarDays },
    { label: "Pacientes", href: "/dashboard/patients", icon: UsersRound },
  ],
  NURSE: [
    { label: "Pacientes", href: "/dashboard/patients", icon: UsersRound },
    { label: "Agenda de hoy", href: "/dashboard/appointments", icon: CalendarDays },
  ],
  RECEPTIONIST: [
    { label: "Nuevo paciente", href: "/dashboard/patients/new", icon: UserPlus },
    { label: "Turno actual", href: "/dashboard/appointments", icon: ClipboardList },
  ],
};

interface DashboardShellProps {
  currentRole: AppRole;
  children: React.ReactNode;
}

export function DashboardShell({ currentRole, children }: DashboardShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const quickActions = HEADER_ACTIONS_BY_ROLE[currentRole];
  const roleLabel = ROLE_SHELL_LABELS[currentRole];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#dff8f7_0%,#ebfbfb_42%,#f7fcfc_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,#10243c_0%,#081725_55%,#06111c_100%)]">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="relative min-h-screen overflow-hidden md:pl-[14.25rem]">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden="true"
        >
          <div className="absolute left-[8%] top-12 h-56 w-56 rounded-full bg-[#9eecea]/45 blur-3xl dark:bg-teal-700/18" />
          <div className="absolute right-[12%] top-24 h-64 w-64 rounded-full bg-[#b7f1ff]/50 blur-3xl dark:bg-sky-700/14" />
          <div className="absolute bottom-8 left-1/3 h-72 w-72 rounded-full bg-white/55 blur-3xl dark:bg-cyan-900/10" />
          <div className="absolute right-10 top-40 h-32 w-32 rounded-[36px] border border-white/35 bg-white/18 rotate-12 blur-sm dark:border-white/6 dark:bg-white/4" />
          <div className="absolute left-16 top-1/2 h-24 w-24 rounded-[28px] border border-white/30 bg-white/16 -rotate-12 blur-sm dark:border-white/6 dark:bg-white/4" />
        </div>

        <div className="relative min-h-screen">
          <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
            <div className="flex min-h-[5.25rem] items-center gap-4 rounded-[30px] border border-white/55 bg-white/58 px-4 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),14px_18px_36px_rgba(122,176,190,0.22),-10px_-10px_24px_rgba(255,255,255,0.65)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/42 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),14px_18px_36px_rgba(0,0,0,0.28)]">
              <div className="flex items-center md:w-16 md:justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Abrir menu de navegacion"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="flex rounded-[20px] border border-white/60 bg-white/70 text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_20px_rgba(135,186,196,0.16)] transition hover:bg-white/85 hover:text-teal-800 md:hidden dark:border-white/8 dark:bg-slate-950/50 dark:text-teal-300 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),8px_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-slate-900/70"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </div>

              <div className="flex flex-1 justify-center">
                <Suspense
                  fallback={
                    <div className="relative w-full max-w-2xl">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        disabled
                        placeholder="Buscando pacientes..."
                        className="h-14 rounded-[22px] border-white/60 bg-white/70 pl-12 text-sm shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_20px_rgba(135,186,196,0.16)]"
                      />
                    </div>
                  }
                >
                  <GlobalSearch />
                </Suspense>
              </div>

              <div className="flex items-center justify-end gap-3 md:w-32">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Notificaciones"
                  className="relative rounded-[20px] border border-white/60 bg-white/70 text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_20px_rgba(135,186,196,0.16)] transition hover:bg-white/85 hover:text-teal-800 dark:border-white/8 dark:bg-slate-950/50 dark:text-teal-300 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),8px_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-slate-900/70"
                >
                  <Bell className="size-5" aria-hidden="true" />
                  <span className="absolute right-3 top-3 size-2.5 rounded-full bg-[#38d9cf] ring-4 ring-white/80 dark:ring-slate-950/90" />
                </Button>

                <ThemeToggle />
              </div>
            </div>
          </header>

          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 rounded-[26px] border border-white/55 bg-white/50 px-4 py-4 shadow-[inset_1px_1px_0_rgba(255,255,255,0.92),12px_14px_28px_rgba(122,176,190,0.16)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/34 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),12px_14px_28px_rgba(0,0,0,0.18)] md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-full border border-white/60 bg-white/72 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),6px_6px_16px_rgba(130,188,198,0.14)] dark:border-white/8 dark:bg-slate-900/60 dark:text-teal-300">
                  {roleLabel}
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Acciones rapidas para el flujo actual
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[18px] border border-white/60 bg-white/72 px-4 py-2 text-sm font-medium text-slate-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_18px_rgba(130,188,198,0.14)] transition-colors hover:bg-white/88 hover:text-teal-700 dark:border-white/8 dark:bg-slate-900/58 dark:text-slate-200 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.16)] dark:hover:bg-slate-900/78 dark:hover:text-teal-300"
                    >
                      <Icon className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
                      <span>{action.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <main className="px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
