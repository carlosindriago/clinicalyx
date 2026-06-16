"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Citas",
    href: "/dashboard/appointments",
    icon: CalendarDays,
  },
  {
    label: "Pacientes",
    href: "/dashboard/patients",
    icon: UsersRound,
  },
  {
    label: "Registros Clínicos",
    href: "/dashboard/clinical-records",
    icon: FileText,
  },
  {
    label: "Configuración",
    href: "/dashboard/settings",
    icon: Settings,
  },
] as const;

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

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
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
      router.push("/dashboard");
      router.refresh();
    } catch {
      router.push("/login");
      router.refresh();
    } finally {
      setSwitchingRole(null);
    }
  };

  const currentRoleLabel = demoSandbox
    ? ROLE_LABELS[demoSandbox.currentRole]
    : "Recepcionista";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[18rem] flex-col bg-[linear-gradient(180deg,#123b66_0%,#0d2f53_52%,#092540_100%)] px-4 py-5 text-white shadow-[18px_0_40px_rgba(8,24,44,0.28)] md:flex">
      <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-white/6 px-4 py-4 shadow-[inset_1px_1px_0_rgba(255,255,255,0.08),inset_-10px_-10px_24px_rgba(4,18,34,0.18),10px_12px_30px_rgba(4,18,34,0.22)] backdrop-blur-sm">
        <div className="flex size-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#d4f8f8,#83ece7)] text-[#0f766e] shadow-[inset_1px_1px_0_rgba(255,255,255,0.75),8px_10px_20px_rgba(5,38,65,0.25)]">
          <HeartPulse className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tracking-tight text-white">
            Clinicalyx
          </p>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-white/70">
            Medical Suite
          </p>
        </div>
      </div>

      <nav aria-label="Authenticated navigation" className="flex-1 space-y-3 px-1 py-8">
        {navigationItems.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex min-h-12 items-center gap-3 rounded-[22px] px-4 text-sm font-medium text-white/78 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                isActive &&
                  "bg-[linear-gradient(145deg,#d8fbfa,#97f2ec)] text-[#0f766e] shadow-[inset_1px_1px_0_rgba(255,255,255,0.85),12px_14px_28px_rgba(4,18,34,0.24)]"
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors group-hover:text-white",
                  isActive ? "text-[#0f766e]" : "text-white"
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <details className="group rounded-[28px] border border-white/10 bg-white/8 p-3 shadow-[inset_1px_1px_0_rgba(255,255,255,0.08),12px_14px_30px_rgba(4,18,34,0.2)] backdrop-blur-sm">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[22px] px-2 py-1.5 outline-none">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#c9fbf7,#7ae6e0)] text-base font-bold text-[#0e7490] shadow-[inset_1px_1px_0_rgba(255,255,255,0.85),8px_10px_18px_rgba(5,38,65,0.24)]">
              R
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {currentRoleLabel}
              </p>
              <p className="truncate text-xs text-white/58">
                Ver cuenta y cambiar rol
              </p>
            </div>
            <ChevronDown
              className="size-4 text-[#7ae6e0] transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="mt-3 space-y-3 rounded-[22px] bg-[#08213a]/35 p-3">
            <div className="rounded-[18px] border border-white/8 bg-white/6 px-3 py-2.5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/45">
                Cuenta activa
              </p>
              <p className="mt-1 truncate text-sm font-medium text-white/88">
                {demoSandbox ? emailForRole(demoSandbox.currentRole) : "Sesión activa"}
              </p>
            </div>

            {demoSandbox && (
              <div className="space-y-2">
                {(["doctor", "receptionist", "admin"] as const).map((role) => {
                  const isCurrentRole = demoSandbox.currentRole === role;

                  return (
                    <Button
                      key={role}
                      type="button"
                      variant="ghost"
                      onClick={() => handleSwitchRole(role)}
                      disabled={switchingRole !== null || isLoggingOut}
                      className={cn(
                        "h-11 w-full justify-between rounded-[18px] border border-white/8 bg-white/7 px-3 text-sm text-white/82 shadow-none hover:bg-white/12 hover:text-white",
                        isCurrentRole &&
                          "bg-[linear-gradient(145deg,rgba(216,251,250,0.98),rgba(151,242,236,0.92))] text-[#0f766e] hover:text-[#0f766e]"
                      )}
                    >
                      <span>{ROLE_LABELS[role]}</span>
                      {switchingRole === role ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </details>

        <div className="rounded-[24px] border border-white/10 bg-white/8 p-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.08),12px_14px_30px_rgba(4,18,34,0.2)] backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            disabled={switchingRole !== null || isLoggingOut}
            className="h-11 w-full justify-between rounded-[18px] px-4 text-sm font-medium text-white/82 hover:bg-white/10 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <LogOut className="size-4" aria-hidden="true" />
              Cerrar sesión
            </span>
            {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : null}
          </Button>
        </div>
      </div>
    </aside>
  );
}
