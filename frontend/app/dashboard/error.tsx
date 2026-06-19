"use client";

// app/dashboard/error.tsx
//
// Error boundary específico del dashboard. Similar a app/error.tsx pero
// con un copy más orientado a "sección del dashboard falló" y un
// botón para volver al dashboard o reintentar.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && error.digest) {
      // eslint-disable-next-line no-console
      console.error("[DashboardError]", error.digest);
    }
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute left-[20%] top-10 h-48 w-48 rounded-full bg-red-100/55 blur-3xl dark:bg-red-900/12" />
        <div className="absolute right-[22%] top-16 h-56 w-56 rounded-full bg-amber-100/50 blur-3xl dark:bg-amber-900/10" />
      </div>

      <div className="relative z-10 w-full max-w-lg rounded-[24px] border border-white/80 bg-white/95 p-6 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),12px_14px_28px_rgba(122,176,190,0.16)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),12px_14px_28px_rgba(0,0,0,0.26)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-[18px] border border-red-100 bg-red-50 text-red-500 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),6px_6px_14px_rgba(220,38,38,0.10)] dark:border-red-900/40 dark:bg-red-950/40">
            <AlertCircle className="size-6" aria-hidden="true" />
          </div>

          <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Error en esta sección
          </h2>

          <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            Ocurrió un problema al cargar este contenido del dashboard.
            Otras secciones siguen funcionando.
          </p>

          {error.digest ? (
            <p className="mt-2 font-mono text-[10px] text-slate-400 dark:text-slate-500">
              Código: {error.digest}
            </p>
          ) : null}

          {isDev && error.message ? (
            <pre className="mt-3 max-h-24 w-full overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-left font-mono text-[10px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {error.message}
            </pre>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,162,190,0.24)] transition hover:brightness-105"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver al dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
