"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Settings,
  UserPlus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserRoleSwitcher, type DemoRole, type UserRoleSwitcherProps } from "@/components/user-role-switcher";
import { cn } from "@/lib/utils";

type DemoCredentials = {
  admin_email: string;
  doctor_email: string;
  receptionist_email: string;
  password: string;
};

type DemoSandboxState = {
  tenantId: string;
  password: string;
  currentRole: DemoRole;
  credentials: DemoCredentials;
};

const DEMO_STORAGE_KEY = "clinicalyx_demo_sandbox";

type SidebarProps = {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAVIGATION_BY_ROLE: Record<DemoRole, NavigationItem[]> = {
  doctor: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Citas", href: "/dashboard/appointments", icon: CalendarDays },
    { label: "Pacientes", href: "/dashboard/patients", icon: UsersRound },
    {
      label: "Registros Clinicos",
      href: "/dashboard/clinical-records",
      icon: FileText,
    },
    { label: "Configuracion", href: "/dashboard/settings", icon: Settings },
  ],
  receptionist: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Agenda", href: "/dashboard/appointments", icon: CalendarDays },
    { label: "Pacientes", href: "/dashboard/patients", icon: UsersRound },
    {
      label: "Nuevo Paciente",
      href: "/dashboard/patients/new",
      icon: UserPlus,
    },
    { label: "Configuracion", href: "/dashboard/settings", icon: Settings },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Operaciones", href: "/dashboard/appointments", icon: ClipboardList },
    { label: "Pacientes", href: "/dashboard/patients", icon: UsersRound },
    { label: "Reportes", href: "/dashboard/patients/new", icon: UserPlus },
    { label: "Configuracion", href: "/dashboard/settings", icon: Settings },
  ],
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [demoSandbox, setDemoSandbox] = useState<DemoSandboxState | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedSandbox = window.localStorage.getItem(DEMO_STORAGE_KEY);
        if (!storedSandbox) {
          return;
        }
        const parsed = JSON.parse(storedSandbox) as DemoSandboxState;
        if (!parsed.tenantId || !parsed.credentials) {
          return;
        }
        setDemoSandbox(parsed);
      } catch {
        setDemoSandbox(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const closeMobileMenu = () => {
    onMobileClose?.();
  };

  const activeRole: DemoRole = demoSandbox?.currentRole ?? "doctor";
  const navigationItems = NAVIGATION_BY_ROLE[activeRole];

  const sidebarContent = (
    <>
      <div className="rounded-br-[24px] border-b border-white/10 pb-5 pl-2 pr-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#d4f8f8,#83ece7)] text-[#0f766e] shadow-[inset_1px_1px_0_rgba(255,255,255,0.75),8px_10px_20px_rgba(5,38,65,0.25)]">
            <HeartPulse className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[1.15rem] font-bold tracking-tight text-white">
              Clinicalyx
            </p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-white/72">
              Medical Suite
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cerrar menu de navegacion"
            onClick={closeMobileMenu}
            className="ml-auto flex size-10 rounded-xl border border-white/10 bg-white/8 text-white hover:bg-white/12 md:hidden"
          >
            <X className="size-4.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <nav
        aria-label="Authenticated navigation"
        className="flex-1 space-y-2 px-4 py-6"
      >
        {navigationItems.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={closeMobileMenu}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-[0.92rem] font-medium text-slate-300 transition-colors duration-200 ease-out hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                isActive &&
                  "bg-teal-500/20 text-teal-300 shadow-[inset_1px_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(4,18,34,0.12)]"
              )}
            >
              <Icon
                className={cn(
                  "size-4.5 transition-colors group-hover:text-white",
                  isActive ? "text-teal-300" : "text-slate-300"
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/*
       * El UserRoleSwitcher es un Client Component autocontenido con
       * "use client" propio, encapsula la lógica del DropdownMenu de
       * Base UI. Esto evita que el Context del DropdownMenu se rompa
       * si este Sidebar se renderiza dentro de un Server Component
       * o layout complejo. Pasamos el sandbox como prop para que
       * UserRoleSwitcher permanezca puro y testeable.
       */}
      <div className="mt-auto px-2 pb-1">
        <UserRoleSwitcher
          sandbox={demoSandbox}
          {...({} as Pick<UserRoleSwitcherProps, "isLoggingOut">)}
        />
      </div>
    </>
  );

  return (
    <>
      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" aria-hidden={!isMobileOpen}>
          <button
            type="button"
            aria-label="Cerrar menu de navegacion"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={closeMobileMenu}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[86vw] flex-col overflow-visible bg-[linear-gradient(180deg,#0f4a7a_0%,#0c3d69_26%,#0a3156_58%,#092947_100%)] px-3 py-4 text-white shadow-2xl dark:bg-[linear-gradient(180deg,#0c1626_0%,#0a1220_50%,#070d18_100%)]">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[14.25rem] flex-col overflow-visible bg-[linear-gradient(180deg,#0f4a7a_0%,#0c3d69_26%,#0a3156_58%,#092947_100%)] px-3 py-4 text-white shadow-[18px_0_40px_rgba(8,24,44,0.24)] dark:bg-[linear-gradient(180deg,#0c1626_0%,#0a1220_50%,#070d18_100%)] dark:shadow-[18px_0_40px_rgba(0,0,0,0.45),inset_1px_0_0_rgba(255,255,255,0.05)] md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
