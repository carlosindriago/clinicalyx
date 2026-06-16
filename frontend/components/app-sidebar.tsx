"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  Stethoscope,
  UserRound,
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
    label: "Appointments",
    href: "/dashboard/appointments",
    icon: CalendarDays,
  },
  {
    label: "Patients",
    href: "/dashboard/patients",
    icon: UsersRound,
  },
  {
    label: "Clinical Records",
    href: "/dashboard/clinical-records",
    icon: FileText,
  },
  {
    label: "Settings",
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
  receptionist: "Receptionist",
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

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm md:flex">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.18)]">
          <Stethoscope className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tracking-tight text-emerald-500">
            Clinicalyx
          </p>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-muted-foreground">
            Medical Suite
          </p>
        </div>
      </div>

      <nav aria-label="Authenticated navigation" className="flex-1 space-y-1 px-3 py-6">
        {navigationItems.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                isActive &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-[inset_3px_0_0_rgb(16,185,129)]"
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors group-hover:text-emerald-500",
                  isActive && "text-emerald-500"
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-background/60 p-3 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <UserRound className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {demoSandbox ? ROLE_LABELS[demoSandbox.currentRole] : "Authenticated User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {demoSandbox ? emailForRole(demoSandbox.currentRole) : "Active session"}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {demoSandbox && (
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSwitchRole("doctor")}
                disabled={switchingRole !== null || isLoggingOut}
                className="justify-between rounded-xl border-emerald-500/20 text-xs"
              >
                <span>Doctor</span>
                {switchingRole === "doctor" ? <Loader2 className="size-4 animate-spin" /> : null}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSwitchRole("receptionist")}
                disabled={switchingRole !== null || isLoggingOut}
                className="justify-between rounded-xl border-sidebar-border text-xs"
              >
                <span>Receptionist</span>
                {switchingRole === "receptionist" ? <Loader2 className="size-4 animate-spin" /> : null}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSwitchRole("admin")}
                disabled={switchingRole !== null || isLoggingOut}
                className="justify-between rounded-xl border-sidebar-border text-xs"
              >
                <span>Superadmin</span>
                {switchingRole === "admin" ? <Loader2 className="size-4 animate-spin" /> : null}
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            disabled={switchingRole !== null || isLoggingOut}
            className="w-full justify-between rounded-xl border border-sidebar-border bg-background/60 text-sm text-muted-foreground hover:text-foreground"
          >
            <span>Cerrar sesion</span>
            {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
