import { Wrench } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute left-[18%] top-14 h-56 w-56 rounded-full bg-slate-200/55 blur-3xl dark:bg-slate-700/20" />
        <div className="absolute right-[20%] top-20 h-64 w-64 rounded-full bg-teal-100/50 blur-3xl dark:bg-teal-900/12" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/80 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06),inset_1px_1px_0_rgba(255,255,255,0.95)] dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35),inset_1px_1px_0_rgba(255,255,255,0.05)]">
        <div className="mb-5 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-[22px] border border-slate-200 bg-[linear-gradient(145deg,#f1f5f9,#e2e8f0)] text-slate-600 shadow-[0_10px_30px_rgba(100,116,139,0.16),inset_1px_1px_0_rgba(255,255,255,0.95)] dark:border-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300">
            <Wrench className="size-8" aria-hidden="true" />
          </div>
        </div>

        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-600 dark:text-teal-300">
          Próximamente
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-50">
          Configuración de la clínica
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          El módulo de configuración está en desarrollo. Incluirá
          gestión de personal, horarios, plantillas de cita y políticas
          RLS por clínica.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,162,190,0.22)] transition hover:brightness-105"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
