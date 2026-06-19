"use client";

// app/error.tsx
//
// Error boundary para rutas FUERA del dashboard (e.g. /login).
// Captura excepciones no manejadas y permite al usuario reintentar.
//
// Seguridad:
//   - En PRODUCCIÓN, no mostramos error.message (puede contener
//     detalles sensibles del backend: queries SQL, stack traces, etc.).
//   - Mostramos error.digest (opaco) para correlación con logs.
//   - En DESARROLLO, mostramos el mensaje real para debugging.

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && error.digest) {
      // eslint-disable-next-line no-console
      console.error("[RouteError]", error.digest);
    }
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute left-[15%] top-12 h-56 w-56 rounded-full bg-red-100/60 blur-3xl dark:bg-red-900/15" />
        <div className="absolute right-[18%] top-20 h-64 w-64 rounded-full bg-amber-100/55 blur-3xl dark:bg-amber-900/12" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-[26px] border border-white/80 bg-white/95 p-7 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),14px_18px_36px_rgba(122,176,190,0.18)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),14px_18px_36px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[20px] border border-red-100 bg-red-50 text-red-500 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),6px_6px_16px_rgba(220,38,38,0.10)] dark:border-red-900/40 dark:bg-red-950/40">
            <AlertCircle className="size-7" aria-hidden="true" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Algo salió mal
          </h2>

          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            No pudimos completar la operación. Por favor, intente de nuevo.
          </p>

          {error.digest ? (
            <p className="mt-3 font-mono text-[11px] text-slate-400 dark:text-slate-500">
              Código: {error.digest}
            </p>
          ) : null}

          {isDev && error.message ? (
            <pre className="mt-4 max-h-32 w-full overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-left font-mono text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {error.message}
            </pre>
          ) : null}

          <button
            type="button"
            onClick={() => reset()}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,162,190,0.24)] transition hover:brightness-105"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
