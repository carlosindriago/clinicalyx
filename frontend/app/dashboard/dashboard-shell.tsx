"use client";

import { Suspense, useState } from "react";
import {
  Bell,
  Menu,
  Search,
} from "lucide-react";

import { Sidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlobalSearch } from "@/components/global-search";

/**
 * Shell de layout del dashboard (Client Component).
 *
 * Responsabilidades:
 *   - Sidebar (móvil + desktop) y su toggle.
 *   - Header sticky con buscador global, notificaciones y theme toggle.
 *   - Slot children para el contenido de la página (DashboardPage, etc.).
 *
 * Lo que este componente NO hace (desde el refactor de "fatiga de
 * encabezados"):
 *   - Ya no renderiza la barra intermedia con la insignia de rol y
 *     los botones de acciones rápidas. Esa barra era redundante con
 *     el eyebrow del hero y empujaba las métricas hacia abajo. Los
 *     quick actions se renderizan ahora dentro del hero card en
 *     DashboardPage, alineados con el CTA principal.
 *
 * El role del usuario (derivado del JWT en el layout server-side)
 * ya no se necesita en este shell porque la insignia de rol y los
 * quick actions migraron a DashboardPage, que los lee del sandbox
 * de localStorage (la misma fuente que el resto de su contenido).
 */
interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
          <div className="absolute left-[8%] top-12 h-56 w-56 rounded-full bg-[#9eecea]/45 blur-3xl dark:bg-teal-700/8" />
          <div className="absolute right-[12%] top-24 h-64 w-64 rounded-full bg-[#b7f1ff]/50 blur-3xl dark:bg-sky-700/6" />
          <div className="absolute bottom-8 left-1/3 h-72 w-72 rounded-full bg-white/55 blur-3xl dark:bg-cyan-900/5" />
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
                  className="flex rounded-[20px] border border-white/60 bg-white/70 text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_20px_rgba(135,186,196,0.16)] transition hover:bg-white/85 hover:text-teal-800 md:hidden dark:border-white/8 dark:bg-slate-950/50 dark:text-teal-400 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),8px_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-slate-900/70"
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
                  className="relative rounded-[20px] border border-white/60 bg-white/70 text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_20px_rgba(135,186,196,0.16)] transition hover:bg-white/85 hover:text-teal-800 dark:border-white/8 dark:bg-slate-950/50 dark:text-teal-400 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),8px_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-slate-900/70"
                >
                  <Bell className="size-5" aria-hidden="true" />
                  <span className="absolute right-3 top-3 size-2.5 rounded-full bg-[#38d9cf] ring-4 ring-white/80 dark:ring-slate-950/90" />
                </Button>

                <ThemeToggle />
              </div>
            </div>
          </header>

          {/*
           * Padding-top del main elevado de pt-6/lg:pt-8 a pt-8/lg:pt-10.
           * Antes había una barra intermedia (insignia + quick actions)
           * entre el header y el main que actuaba como separador visual
           * y consumia ~80px verticales. Sin esa barra, este padding
           * adicional evita que el hero card se sienta "pegado" al
           * header y mantiene el ritmo vertical armonioso.
           */}
          <main className="px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
