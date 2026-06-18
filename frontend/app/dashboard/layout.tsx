import { Suspense } from "react";
import { Bell, Search } from "lucide-react";

import { Sidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlobalSearch } from "@/components/global-search";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#dff8f7_0%,#ebfbfb_42%,#f7fcfc_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,#10243c_0%,#081725_55%,#06111c_100%)]">
      <Sidebar />

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
            <Suspense
              fallback={
                <div className="relative max-w-xl flex-1">
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
          </header>

          <main className="px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
