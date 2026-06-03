"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Settings,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";

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

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

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
            <p className="truncate text-sm font-semibold text-foreground">Dr. Smith</p>
            <p className="truncate text-xs text-muted-foreground">Senior Surgeon</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
