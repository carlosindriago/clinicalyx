"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DemoCredentials {
  admin_email: string;
  doctor_email: string;
  receptionist_email: string;
  password: string;
}

interface DemoResponse {
  status: string;
  message: string;
  role: string;
  tenant_id: string;
  // Los tokens de sesión (access_token, refresh_token) llegan
  // exclusivamente como cookies HttpOnly. NO se exponen en el body JSON
  // para evitar robo vía XSS.
  credentials: DemoCredentials;
}

type DemoRole = "doctor" | "receptionist" | "admin";

const DEMO_STORAGE_KEY = "clinicalyx_demo_sandbox";

const ROLE_LABELS: Record<DemoRole, string> = {
  doctor: "Doctor",
  receptionist: "Recepcionista",
  admin: "Superadmin",
};

const LOADING_STEPS = [
  "Preparando tu entorno clínico…",
  "Estableciendo conexión segura…",
  "Generando llaves criptográficas con AES-256-GCM…",
  "Creando índices ciegos HMAC-SHA256 para búsquedas exactas…",
  "Aplicando políticas de aislamiento por clínica (RLS)…",
  "Sembrando pacientes y antecedentes de prueba…",
  "Programando las próximas citas del día…",
  "Emitiendo sesión con tokens HttpOnly seguros…",
];

function parseRoleParam(value: string | null): DemoRole {
  if (value === "receptionist" || value === "admin" || value === "doctor") {
    return value;
  }
  return "doctor";
}

function DemoLoadingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRole = parseRoleParam(searchParams.get("role"));
  const hasFetched = useRef<boolean>(false);

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<DemoResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 1. Rotación animada de los steps de carga.
  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const interval = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1200);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  // 2. Auto-start al montar. Un único POST al backend con ?role=.
  // El backend crea el sandbox, autentica con el rol solicitado y
  // emite las cookies HttpOnly. Sin doble round-trip.
  useEffect(() => {
    if (hasFetched.current) {
      return;
    }
    hasFetched.current = true;

    const startDemoEnvironment = async () => {
      try {
        const response = await fetch(
          `/api/demo/start?role=${encodeURIComponent(requestedRole)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data: DemoResponse | { error: string } = await response.json();

        if (!response.ok) {
          throw new Error(
            ("error" in data ? data.error : null) ||
              "Error al inicializar el entorno de demostración temporal."
          );
        }

        const successData = data as DemoResponse;

        // Persistir el estado del sandbox en localStorage para que el
        // sidebar pueda mostrar el rol activo.
        if (typeof window !== "undefined") {
          const sandboxState = {
            tenantId: successData.tenant_id,
            password: successData.credentials.password,
            currentRole: requestedRole,
            credentials: successData.credentials,
          };
          window.localStorage.setItem(
            DEMO_STORAGE_KEY,
            JSON.stringify(sandboxState)
          );
        }

        setDemoData(successData);
        setIsLoading(false);

        // 3. Redirect automático al dashboard. El usuario ya está
        // autenticado vía cookies HttpOnly.
        window.setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 600);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo establecer conexión con el servidor.";
        setError(message);
        setIsLoading(false);
      }
    };

    void startDemoEnvironment();
  }, [requestedRole, router]);

  const handleCopy = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    window.setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 font-sans text-slate-700 dark:bg-slate-950">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-[8%] top-14 h-64 w-64 rounded-full bg-teal-100/80 blur-3xl dark:bg-teal-700/15" />
        <div className="absolute right-[10%] top-24 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl dark:bg-sky-700/15" />
        <div className="absolute bottom-8 left-1/3 h-80 w-80 rounded-full bg-white blur-3xl dark:bg-cyan-900/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,#000_68%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[640px] p-2">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#d8fbfa,#97f2ec)] text-teal-600 shadow-[0_10px_30px_rgba(20,184,166,0.16),inset_1px_1px_0_rgba(255,255,255,0.85)] dark:bg-[linear-gradient(145deg,#0d3a3a,#0a2628)] dark:text-teal-300">
            <Activity className="size-7 stroke-[2.4]" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-50">
            Clinicalyx
          </h1>
          <p className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Suite Médica
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            {isLoading
              ? "Iniciando sesión como " + ROLE_LABELS[requestedRole] + "…"
              : "Sesión iniciada. Redirigiendo al dashboard…"}
          </p>
        </div>

        {isLoading ? (
          <Card className="rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06),inset_1px_1px_0_rgba(255,255,255,0.95)] animate-in fade-in duration-500 dark:border-white/8 dark:bg-slate-900/95">
            <CardContent className="flex flex-col items-center justify-center space-y-7 px-6 py-12 text-center">
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute size-28 animate-spin rounded-full border-2 border-transparent border-t-teal-500 border-r-teal-400/60 duration-1000"
                  aria-hidden="true"
                />
                <div
                  className="absolute size-20 animate-spin rounded-full border-2 border-transparent border-b-emerald-400/80 border-l-emerald-300/50 duration-[1500ms] [animation-direction:reverse]"
                  aria-hidden="true"
                />
                <div
                  className="absolute size-12 animate-ping rounded-full bg-teal-400/15 duration-2000"
                  aria-hidden="true"
                />
                <div className="relative flex size-16 items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,#effcfb,#d8fbfa)] text-teal-600 shadow-[0_10px_30px_rgba(20,184,166,0.18),inset_1px_1px_0_rgba(255,255,255,0.95)] dark:bg-[linear-gradient(145deg,#0d3a3a,#0a2628)] dark:text-teal-300">
                  <Activity className="size-7" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-50">
                  Preparando tu entorno clínico
                </h2>
                <div
                  className="flex h-6 items-center justify-center"
                  aria-live="polite"
                >
                  <p
                    key={stepIndex}
                    className="animate-in fade-in slide-in-from-bottom-1 text-sm font-medium text-slate-500 duration-300 dark:text-slate-400"
                  >
                    {LOADING_STEPS[stepIndex]}
                  </p>
                </div>
              </div>

              <div
                className="relative h-2 w-64 overflow-hidden rounded-full bg-slate-100 shadow-[inset_1px_1px_2px_rgba(15,23,42,0.08)] dark:bg-slate-800/60"
                role="progressbar"
                aria-label="Progreso de inicialización del sandbox"
              >
                <div
                  className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-[linear-gradient(90deg,transparent,#25cbc9,#1da2be,transparent)] shadow-[0_4px_12px_rgba(29,162,190,0.45)]"
                  style={{
                    animationName: "demo-progress",
                    animationDuration: "1.6s",
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                  }}
                />
              </div>

              <div className="grid w-full max-w-xl gap-3 pt-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-teal-100/70 bg-teal-50/70 px-4 py-3 text-left shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)] dark:border-teal-900/40 dark:bg-teal-950/30">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">
                    Seguridad
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Aislamiento por clínica con RLS.
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-100/70 bg-sky-50/70 px-4 py-3 text-left shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)] dark:border-sky-900/40 dark:bg-sky-950/30">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                    Datos demo
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Pacientes y citas de ejemplo.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-left shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)] dark:border-slate-700/60 dark:bg-slate-800/40">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 dark:text-slate-300">
                    En vivo
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Configuración automática en curso.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Éxito breve: redirigiendo al dashboard */}
        {!isLoading && !error && demoData ? (
          <Card className="rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06),inset_1px_1px_0_rgba(255,255,255,0.95)] animate-in fade-in zoom-in-95 duration-500 dark:border-white/8 dark:bg-slate-900/95">
            <CardHeader className="pb-4 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#e7fffb,#d3faf3)] text-teal-600 shadow-[0_10px_24px_rgba(20,184,166,0.12)]">
                <CheckCircle2 className="size-6" />
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-800">
                ¡Listo! Iniciando como {ROLE_LABELS[requestedRole]}
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                {demoData.message}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
                  <Building className="size-4 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Demo Tenant
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">
                      {demoData.tenant_id}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(demoData.tenant_id, "tenant")}
                    className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 dark:hover:bg-slate-800"
                    title="Copiar tenant ID"
                  >
                    {copiedField === "tenant" ? (
                      <Check className="size-3.5 text-teal-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300">
                  <KeyRound className="size-4 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Contraseña común
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                      {demoData.credentials.password}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(demoData.credentials.password, "password")}
                    className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 dark:hover:bg-slate-800"
                    title="Copiar contraseña"
                  >
                    {copiedField === "password" ? (
                      <Check className="size-3.5 text-teal-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-medium leading-normal text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>
                  Este sandbox tiene políticas de destrucción automática.
                  Toda la información será purgada por el Grim Reaper en un
                  periodo de 2 horas.
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pb-6 pt-4 dark:border-slate-800">
              <Button
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
                className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(145deg,#25cbc9,#1da2be)] font-bold text-white shadow-[0_14px_28px_rgba(29,162,190,0.18)] transition-all duration-300 hover:brightness-105"
              >
                <span>Entrar al sistema</span>
                <ArrowRight className="size-4 text-white transition-transform group-hover:translate-x-1" />
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {!isLoading && error ? (
          <Card className="animate-in rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06),inset_1px_1px_0_rgba(255,255,255,0.95)] scale-in duration-300 dark:border-white/8 dark:bg-slate-900/95">
            <CardHeader className="pb-4 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[18px] border border-red-100 bg-red-50 text-red-500">
                <AlertCircle className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-800">
                Fallo al inicializar la demo
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-slate-500">
                La solicitud de creación del entorno fue rechazada o interrumpida.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6 text-center">
              <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium leading-relaxed text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {error.includes("Too many requests") || error.includes("429")
                  ? "Límite de solicitudes excedido por seguridad IP. Has alcanzado el máximo de 3 demostraciones por hora. Inténtalo de nuevo más tarde."
                  : error}
              </p>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button
                onClick={() => router.push("/login")}
                className="h-12 cursor-pointer rounded-2xl bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-6 font-semibold text-white shadow-[0_14px_28px_rgba(29,162,190,0.18)] transition-all duration-300 hover:brightness-105"
              >
                Volver al login
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

// Suspense boundary requerido por Next.js 15+ para useSearchParams
// en client components. El fallback es null (se resuelve en milisegundos).
export default function DemoLoadingPage() {
  return (
    <Suspense fallback={null}>
      <DemoLoadingPageInner />
    </Suspense>
  );
}
