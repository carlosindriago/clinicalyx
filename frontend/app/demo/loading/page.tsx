"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { RoleIllustration } from "@/components/role-illustration";
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
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  credentials: DemoCredentials;
}

type DemoRole = "doctor" | "receptionist" | "admin";

type DemoSandboxState = {
  tenantId: string;
  password: string;
  currentRole: DemoRole;
  credentials: DemoCredentials;
};

const DEMO_STORAGE_KEY = "clinicalyx_demo_sandbox";

const ROLE_LABELS: Record<DemoRole, string> = {
  doctor: "Doctor",
  receptionist: "Recepcionista",
  admin: "Superadmin",
};

const LOADING_STEPS = [
  "Provisionando tenant aislado del sandbox...",
  "Generando llaves criptograficas seguras...",
  "Cifrando campos sensibles con AES-256-GCM...",
  "Creando indices ciegos HMAC-SHA256 para documentos...",
  "Sembrando pacientes y antecedentes clinicos de prueba...",
  "Programando las proximas citas del dia...",
  "Aplicando politicas PostgreSQL Row-Level Security...",
  "Emitiendo sesion efimera inicial para el Doctor...",
];

const ROLE_CARD_STYLES: Record<
  DemoRole,
  {
    border: string;
    badge: string;
    button: string;
    hint?: string;
  }
> = {
  doctor: {
    border: "border-teal-200 bg-teal-50/75",
    badge: "bg-teal-100 text-teal-700",
    button:
      "bg-[linear-gradient(145deg,#25cbc9,#1da2be)] text-white shadow-[0_12px_24px_rgba(29,162,190,0.16)] hover:brightness-105",
    hint: "Acceso inicial configurado",
  },
  receptionist: {
    border: "border-sky-200 bg-sky-50/70",
    badge: "bg-sky-100 text-sky-700",
    button: "border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
  },
  admin: {
    border: "border-violet-200 bg-violet-50/70",
    badge: "bg-violet-100 text-violet-700",
    button: "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",
  },
};

export default function DemoLoadingPage() {
  const router = useRouter();
  const hasFetched = useRef<boolean>(false);

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<DemoResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [switchingRole, setSwitchingRole] = useState<DemoRole | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (hasFetched.current) {
      return;
    }

    hasFetched.current = true;

    const startDemoEnvironment = async () => {
      try {
        const response = await fetch("/api/demo/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data: DemoResponse | { error: string } = await response.json();

        if (!response.ok) {
          throw new Error(
            ("error" in data ? data.error : null) ||
              "Error al inicializar el entorno de demostracion temporal."
          );
        }

        setDemoData(data as DemoResponse);
        setIsLoading(false);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo establecer conexion con el servidor.";
        setError(message);
        setIsLoading(false);
      }
    };

    void startDemoEnvironment();
  }, []);

  useEffect(() => {
    if (!demoData) {
      return;
    }

    const sandboxState: DemoSandboxState = {
      tenantId: demoData.tenant_id,
      password: demoData.credentials.password,
      currentRole: "doctor",
      credentials: demoData.credentials,
    };

    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(sandboxState));
  }, [demoData]);

  const handleCopy = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    window.setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const emailForRole = (credentials: DemoCredentials, role: DemoRole) => {
    switch (role) {
      case "doctor":
        return credentials.doctor_email;
      case "receptionist":
        return credentials.receptionist_email;
      case "admin":
        return credentials.admin_email;
    }
  };

  const persistCurrentRole = (role: DemoRole) => {
    if (!demoData) {
      return;
    }

    const sandboxState: DemoSandboxState = {
      tenantId: demoData.tenant_id,
      password: demoData.credentials.password,
      currentRole: role,
      credentials: demoData.credentials,
    };

    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(sandboxState));
  };

  const handleEnterAsRole = async (role: DemoRole) => {
    if (!demoData) {
      return;
    }

    setActionError(null);
    setSwitchingRole(role);

    try {
      if (role !== "doctor") {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": demoData.tenant_id,
          },
        });

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": demoData.tenant_id,
          },
          body: JSON.stringify({
            tenant_id: demoData.tenant_id,
            email: emailForRole(demoData.credentials, role),
            password: demoData.credentials.password,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            payload && typeof payload.error === "string"
              ? payload.error
              : "No se pudo cambiar al usuario seleccionado.";
          throw new Error(message);
        }
      }

      persistCurrentRole(role);
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar al usuario del sandbox."
      );
    } finally {
      setSwitchingRole(null);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 font-sans text-slate-700">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-[8%] top-14 h-64 w-64 rounded-full bg-teal-100/80 blur-3xl" />
        <div className="absolute right-[10%] top-24 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="absolute bottom-8 left-1/3 h-80 w-80 rounded-full bg-white blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,#000_68%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[720px] p-2">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#d8fbfa,#97f2ec)] text-teal-600 shadow-[0_10px_30px_rgba(20,184,166,0.16)]">
            <Activity className="size-7 stroke-[2.4]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Clinicalyx
          </h1>
          <p className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Medical Suite
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Entorno demo efimero, seguro y aislado para explorar la suite medica.
          </p>
        </div>

        {isLoading ? (
          <Card className="animate-in rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.03)] fade-in duration-500">
            <CardContent className="flex flex-col items-center justify-center space-y-6 px-6 py-12 text-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute size-24 animate-spin rounded-full border border-teal-200 border-t-teal-500 duration-1000" />
                <div className="flex size-16 items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,#effcfb,#d8fbfa)] text-teal-600 shadow-[0_10px_30px_rgba(20,184,166,0.14)]">
                  <Activity className="size-8" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                  Preparando tu sandbox clinico
                </h2>
                <div className="flex h-6 items-center justify-center">
                  <p className="animate-pulse text-sm font-medium text-slate-500 transition-all duration-300">
                    {LOADING_STEPS[stepIndex]}
                  </p>
                </div>
              </div>

              <div className="h-2 w-56 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-[linear-gradient(145deg,#25cbc9,#1da2be)] shadow-[0_6px_18px_rgba(29,162,190,0.18)]" />
              </div>

              <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-teal-700">
                    Seguridad
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Aislamiento por tenant y RLS.
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-sky-700">
                    Datos demo
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Pacientes y citas de ejemplo.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-700">
                    Tiempo real
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Configuracion automatica en curso.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && error ? (
          <Card className="animate-in rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.03)] scale-in duration-300">
            <CardHeader className="pb-4 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[18px] border border-red-100 bg-red-50 text-red-500">
                <AlertCircle className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-800">
                Fallo al inicializar la demo
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-slate-500">
                La solicitud de creacion del entorno fue rechazada o interrumpida.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6 text-center">
              <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium leading-relaxed text-red-600">
                {error.includes("Too many requests") || error.includes("429")
                  ? "Limite de solicitudes excedido por seguridad IP. Espera 1 hora antes de intentarlo nuevamente."
                  : error}
              </p>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-slate-100 pt-4">
              <Button
                onClick={() => router.push("/login")}
                className="h-12 cursor-pointer rounded-2xl bg-[linear-gradient(145deg,#25cbc9,#1da2be)] px-6 font-semibold text-white shadow-[0_14px_28px_rgba(29,162,190,0.18)] transition-all duration-300 hover:brightness-105"
              >
                Volver al login
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {!isLoading && !error && demoData ? (
          <Card className="animate-in rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.03)] fade-in zoom-in-95 duration-500">
            <CardHeader className="pb-4 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#e7fffb,#d3faf3)] text-teal-600 shadow-[0_10px_24px_rgba(20,184,166,0.12)]">
                <CheckCircle2 className="size-6" />
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-800">
                ¡Tu sandbox esta listo!
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Se genero un entorno clinico temporal, aislado y seguro para tus pruebas.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
                  <Building className="size-4 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Demo Tenant
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-700">
                      {demoData.tenant_id}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(demoData.tenant_id, "tenant")}
                    className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                    title="Copiar tenant ID"
                  >
                    {copiedField === "tenant" ? (
                      <Check className="size-3.5 text-teal-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
                  <KeyRound className="size-4 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Contrasena comun
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-700">
                      {demoData.credentials.password}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(demoData.credentials.password, "password")}
                    className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                    title="Copiar contrasena"
                  >
                    {copiedField === "password" ? (
                      <Check className="size-3.5 text-teal-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {actionError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
                  {actionError}
                </div>
              ) : null}

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Roles disponibles
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Entra con cualquiera de los perfiles del entorno demo usando la misma contrasena.
                  </p>
                </div>

                <div className="grid gap-3">
                  {(["doctor", "receptionist", "admin"] as const).map((role) => {
                    const styles = ROLE_CARD_STYLES[role];
                    const email = emailForRole(demoData.credentials, role);
                    const isDoctor = role === "doctor";

                    return (
                      <div
                        key={role}
                        className={`group flex flex-col gap-3 rounded-[24px] border p-4 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between ${styles.border}`}
                      >
                        <div className="flex items-center gap-3">
                          <RoleIllustration role={role} compact className="size-12" />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${styles.badge}`}
                              >
                                {ROLE_LABELS[role]}
                              </span>
                              {isDoctor ? (
                                <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">
                                  <UserCheck className="size-3" />
                                  {styles.hint}
                                </span>
                              ) : null}
                            </div>
                            <p className="font-mono text-xs font-medium text-slate-700">
                              {email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleCopy(email, role)}
                            className="rounded-2xl border border-white/70 bg-white/85 p-2 text-slate-400 transition-colors hover:text-slate-600"
                            title={`Copiar correo de ${ROLE_LABELS[role]}`}
                          >
                            {copiedField === role ? (
                              <Check className="size-4 text-teal-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                          <Button
                            type="button"
                            variant={role === "doctor" ? "default" : "outline"}
                            onClick={() => handleEnterAsRole(role)}
                            disabled={switchingRole !== null}
                            className={`h-10 rounded-2xl px-4 text-xs font-semibold ${styles.button}`}
                          >
                            {switchingRole === role ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Entrar"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-medium leading-normal text-amber-700">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>
                  Este sandbox tiene politicas de destruccion automatica. Toda la informacion sera purgada por el Grim Reaper en un periodo de 2 horas.
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pb-6 pt-4">
              <Button
                onClick={() => handleEnterAsRole("doctor")}
                disabled={switchingRole !== null}
                className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(145deg,#25cbc9,#1da2be)] font-bold text-white shadow-[0_14px_28px_rgba(29,162,190,0.18)] transition-all duration-300 hover:brightness-105"
              >
                {switchingRole === "doctor" ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Entrar al sistema</span>
                    <ArrowRight className="size-4 text-white transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
