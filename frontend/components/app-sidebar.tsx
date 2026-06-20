"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  UserPlus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleIllustration } from "@/components/role-illustration";
import { cn } from "@/lib/utils";

type DemoCredentials = {
  admin_email: string;
  doctor_email: string;
  receptionist_email: string;
  password: string;
};

type DemoRole = "doctor" | "receptionist" | "admin";

type DemoSandboxState = {
  tenantId: string;
  password: string;
  currentRole: DemoRole;
  credentials: DemoCredentials;
};

const DEMO_STORAGE_KEY = "clinicalyx_demo_sandbox";

const ROLE_LABELS: Record<DemoRole, string> = {
  admin: "Superadmin",
  doctor: "Doctor",
  receptionist: "Recepcionista",
};

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
  const router = useRouter();
  const [demoSandbox, setDemoSandbox] = useState<DemoSandboxState | null>(null);
  const [switchingRole, setSwitchingRole] = useState<DemoRole | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const emailForRole = (role: DemoRole) => {
    if (!demoSandbox) {
      return "";
    }

    switch (role) {
      case "doctor":
        return demoSandbox.credentials.doctor_email;
      case "receptionist":
        return demoSandbox.credentials.receptionist_email;
      case "admin":
        return demoSandbox.credentials.admin_email;
    }
  };

  const persistCurrentRole = (role: DemoRole) => {
    if (!demoSandbox) {
      return;
    }

    const updatedSandbox: DemoSandboxState = {
      ...demoSandbox,
      currentRole: role,
    };

    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updatedSandbox));
    setDemoSandbox(updatedSandbox);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    closeMobileMenu();

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: demoSandbox
          ? {
              "Content-Type": "application/json",
              "X-Tenant-ID": demoSandbox.tenantId,
            }
          : undefined,
      });
    } finally {
      router.push("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  const handleSwitchRole = async (role: DemoRole) => {
    if (!demoSandbox) {
      return;
    }

    if (demoSandbox.currentRole === role) {
      closeMobileMenu();
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSwitchingRole(role);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": demoSandbox.tenantId,
        },
      });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": demoSandbox.tenantId,
        },
        body: JSON.stringify({
          tenant_id: demoSandbox.tenantId,
          email: emailForRole(role),
          password: demoSandbox.password,
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo cambiar el usuario del sandbox.");
      }

      persistCurrentRole(role);
      closeMobileMenu();
      // Recarga absoluta de la página para garantizar que:
      // 1. Las cookies HttpOnly nuevas (set por /api/auth/login) se
      //    propaguen correctamente al siguiente request.
      // 2. El dashboard Server Component se re-fetcheé con el nuevo
      //    rol (extraído del JWT en el cookie) — router.push/router.refresh
      //    no garantiza esto cuando cambia el subject del JWT.
      // 3. Se limpie el Client Router Cache de Next.js.
      // Se usa .replace() (método, no asignación) para satisfacer la
      // regla react-hooks/immutability de eslint-config-next, y para
      // reemplazar la entrada del historial (back button no devuelve
      // a la sesión anterior, lo cual es deseable tras cambio de rol).
      window.location.replace("/dashboard");
    } catch {
      closeMobileMenu();
      window.location.replace("/login");
    } finally {
      setSwitchingRole(null);
    }
  };

  const currentRoleLabel = demoSandbox
    ? ROLE_LABELS[demoSandbox.currentRole]
    : "Recepcionista";

  const closeMobileMenu = () => {
    onMobileClose?.();
  };

  const activeRole = demoSandbox?.currentRole ?? "doctor";
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

      <div className="mt-auto space-y-2 px-2 pb-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[18px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-1.5 text-left shadow-[inset_1px_1px_0_rgba(255,255,255,0.08),8px_12px_24px_rgba(4,18,34,0.18)] backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#c9fbf7,#7ae6e0)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.85),8px_10px_18px_rgba(5,38,65,0.24)]">
                  {demoSandbox ? (
                    <RoleIllustration
                      role={demoSandbox.currentRole}
                      compact
                      className="scale-[1.15]"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#0f766e]">R</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {currentRoleLabel}
                  </p>
                </div>
                <ChevronDown
                  className="size-4 text-[#7ae6e0]"
                  aria-hidden="true"
                />
              </button>
            }
          />
          {/*
           * side="top" align="end" fuerza que el dropdown SIEMPRE se
           * abra hacia arriba (nunca se recorta en pantallas bajas) y
           * alineado al final del trigger (estético consistente).
           * sideOffset añade un gap visual entre el trigger y el menú.
           */}
          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={10}
            className="w-64 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,#0d3b5e_0%,#0a2c47_100%)] p-2 text-white shadow-[0_18px_50px_rgba(0,0,0,0.45),inset_1px_1px_0_rgba(255,255,255,0.08)]"
          >
            {demoSandbox ? (
              <>
                <DropdownMenuLabel className="space-y-1 px-2 py-1.5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Sesión actual
                  </p>
                  <p className="truncate text-xs font-medium text-white/85">
                    {emailForRole(demoSandbox.currentRole)}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-white/10" />
                <DropdownMenuLabel className="px-2 pt-1 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Cambiar de rol
                </DropdownMenuLabel>
                {(["doctor", "receptionist", "admin"] as const).map((role) => {
                  const isCurrentRole = demoSandbox.currentRole === role;
                  const isSwitching = switchingRole === role;

                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleSwitchRole(role)}
                      disabled={switchingRole !== null || isLoggingOut}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm text-white/85",
                        "focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white",
                        isCurrentRole &&
                          "bg-[linear-gradient(145deg,rgba(216,251,250,0.18),rgba(151,242,236,0.12))] text-[#c9fbf7]"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <RoleIllustration
                          role={role}
                          compact
                          className="size-7 rounded-full"
                        />
                        <span className="font-medium">{ROLE_LABELS[role]}</span>
                      </span>
                      {isCurrentRole ? (
                        <Check
                          className="size-4 text-[#7ae6e0]"
                          aria-hidden="true"
                        />
                      ) : isSwitching ? (
                        <Loader2
                          className="size-4 animate-spin text-white/70"
                          aria-hidden="true"
                        />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator className="my-1 bg-white/10" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={switchingRole !== null || isLoggingOut}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-rose-200 focus:bg-rose-500/15 focus:text-rose-100 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-100"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="font-medium">Cerrar sesión</span>
                  {isLoggingOut ? (
                    <Loader2
                      className="ml-auto size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-rose-200 focus:bg-rose-500/15 focus:text-rose-100 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-100"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="font-medium">Cerrar sesión</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {isMobileOpen ? (
        /*
         * overflow-visible en el overlay para que el dropdown del
         * selector de rol pueda abrirse por encima del borde inferior
         * sin recortarse. La sombra interna la provee el contenido.
         */
        <div className="fixed inset-0 z-50 md:hidden" aria-hidden={!isMobileOpen}>
          <button
            type="button"
            aria-label="Cerrar menu de navegacion"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={closeMobileMenu}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[86vw] flex-col overflow-visible bg-[linear-gradient(180deg,#0f4a7a_0%,#0c3d69_26%,#0a3156_58%,#092947_100%)] px-3 py-4 text-white shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      {/*
       * overflow-visible (antes overflow-hidden) en el aside desktop
       * para evitar que el dropdown del selector de rol (que se abre
       * con side="top" align="end") se recorte contra el borde
       * inferior del sidebar en pantallas bajas.
       */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[14.25rem] flex-col overflow-visible bg-[linear-gradient(180deg,#0f4a7a_0%,#0c3d69_26%,#0a3156_58%,#092947_100%)] px-3 py-4 text-white shadow-[18px_0_40px_rgba(8,24,44,0.24)] md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
