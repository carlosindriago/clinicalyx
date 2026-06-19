"use client";

// app/global-error.tsx
//
// Error boundary GLOBAL (raíz de la app). Reemplaza el root layout
// cuando un error fatal ocurre fuera del routing normal. Debe incluir
// SIEMPRE <html> y <body> porque es el documento raíz.
//
// Seguridad:
//   - NO mostramos error.message en producción (puede contener rutas
//     de archivos, queries SQL, stack traces).
//   - Mostramos error.digest (hash opaco generado por Next.js) que
//     puede correlacionarse con logs del servidor.
//   - El botón "Reintentar" llama a reset() que re-renderiza la app
//     desde la raíz.

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log a servicio externo. En desarrollo Next.js muestra el error
    // en consola; en producción se debería enviar a Sentry/Datadog/etc.
    // Importante: NO loguear error.message al cliente en producción.
    if (process.env.NODE_ENV === "production" && error.digest) {
      // eslint-disable-next-line no-console
      console.error("[GlobalError]", error.digest);
    }
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-700 antialiased font-sans dark:bg-slate-950 dark:text-slate-200">
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div className="absolute left-[8%] top-14 h-64 w-64 rounded-full bg-red-100/70 blur-3xl dark:bg-red-900/20" />
            <div className="absolute right-[10%] top-24 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl dark:bg-orange-900/15" />
          </div>

          <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/80 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-[22px] border border-red-100 bg-red-50 text-red-500 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_8px_18px_rgba(220,38,38,0.12)] dark:border-red-900/40 dark:bg-red-950/40">
                <AlertTriangle className="size-8" aria-hidden="true" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Error crítico
              </h1>

              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                La aplicación encontró un error inesperado. Nuestro equipo
                ha sido notificado. Por favor, intente recargar.
              </p>

              {error.digest ? (
                <p className="mt-4 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                  Código de seguimiento: {error.digest}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => reset()}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(29,162,190,0.28)] transition hover:brightness-105"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
