"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Headphones,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  Play,
  ShieldCheck,
  Stethoscope,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

type RoleCardConfig = {
  key: DemoRole;
  label: string;
  description: string;
  Icon: typeof Stethoscope;
  iconClass: string;
  ringClass: string;
  hoverClass: string;
};

const ROLE_CARDS: RoleCardConfig[] = [
  {
    key: "doctor",
    label: "Doctor",
    description: "Vista clínica completa",
    Icon: Stethoscope,
    iconClass: "text-teal-700 dark:text-teal-300",
    ringClass: "bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40",
    hoverClass: "hover:border-teal-300/70 hover:bg-teal-50/50 dark:hover:border-teal-400/30 dark:hover:bg-teal-950/30",
  },
  {
    key: "receptionist",
    label: "Recepcionista",
    description: "Gestión de pacientes y agenda",
    Icon: Headphones,
    iconClass: "text-sky-700 dark:text-sky-300",
    ringClass: "bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900/40 dark:to-cyan-900/40",
    hoverClass: "hover:border-sky-300/70 hover:bg-sky-50/50 dark:hover:border-sky-400/30 dark:hover:bg-sky-950/30",
  },
  {
    key: "admin",
    label: "Superadmin",
    description: "Operación y configuración",
    Icon: UserCog,
    iconClass: "text-violet-700 dark:text-violet-300",
    ringClass: "bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/40 dark:to-fuchsia-900/40",
    hoverClass: "hover:border-violet-300/70 hover:bg-violet-50/50 dark:hover:border-violet-400/30 dark:hover:bg-violet-950/30",
  },
];

export default function LoginPage() {
  const router = useRouter();

  // Estado del formulario principal
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Estado del sandbox (sesión efímera del demo)
  const [isDemoEnabled, setIsDemoEnabled] = useState(false);
  const [demoSandbox, setDemoSandbox] = useState<DemoSandboxState | null>(null);
  const [quickLoginRole, setQuickLoginRole] = useState<DemoRole | null>(null);

  // Estado de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDemoRuntimeConfig = async () => {
      try {
        const response = await fetch("/api/demo/start", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data: { enabled?: boolean } = await response.json();
        setIsDemoEnabled(data.enabled === true);
      } catch {
        setIsDemoEnabled(false);
      }
    };

    void loadDemoRuntimeConfig();
  }, []);

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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Credenciales inválidas o error de red");
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión. Inténtalo de nuevo.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: DemoRole) => {
    if (!demoSandbox) {
      return;
    }

    setQuickLoginRole(role);
    setError(null);

    try {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar sesión en el sandbox.");
      }

      persistCurrentRole(role);
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión en el sandbox.";

      setError(message);
    } finally {
      setQuickLoginRole(null);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 font-sans dark:bg-slate-950">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-[8%] top-16 h-64 w-64 rounded-full bg-teal-100/80 blur-3xl dark:bg-teal-700/15" />
        <div className="absolute right-[10%] top-24 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl dark:bg-sky-700/15" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-white blur-3xl dark:bg-cyan-900/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,#000_68%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[480px] p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#d8fbfa,#97f2ec)] text-teal-600 shadow-[0_10px_30px_rgba(20,184,166,0.16),inset_1px_1px_0_rgba(255,255,255,0.85)] dark:bg-[linear-gradient(145deg,#0d3a3a,#0a2628)] dark:text-teal-300">
            <HeartPulse className="size-7 stroke-[2.4]" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-50">
            Clinicalyx
          </h1>
          <p className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Suite Médica
          </p>
          <p className="mt-3 max-w-sm text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            Tu portal médico seguro, con cifrado de extremo a extremo y
            aislamiento por clínica.
          </p>
        </div>

        <Card className="rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06),inset_1px_1px_0_rgba(255,255,255,0.95)] dark:border-white/8 dark:bg-slate-900/95 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35),inset_1px_1px_0_rgba(255,255,255,0.05)]">
          <CardHeader className="space-y-1 pb-5">
            <CardTitle className="text-center text-xl font-bold text-slate-800 dark:text-slate-50">
              Iniciar sesión
            </CardTitle>
            <CardDescription className="text-center text-sm text-slate-500 dark:text-slate-400">
              Ingresa con tus credenciales de la organización
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-red-200/70 bg-red-50/80 p-3 text-xs text-red-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)] animate-in fade-in slide-in-from-top-2 duration-300 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
                >
                  <AlertCircle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"
                >
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="doctor@tuclinica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200/80 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 shadow-[inset_2px_2px_6px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus-visible:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-500/30 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"
                  >
                    Contraseña
                  </Label>
                  <a
                    href="#"
                    className="text-xs font-medium text-teal-600 transition-colors hover:text-teal-700 hover:underline dark:text-teal-300"
                  >
                    ¿La olvidaste?
                  </a>
                </div>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200/80 bg-slate-50 pl-10 pr-11 text-sm text-slate-800 shadow-[inset_2px_2px_6px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus-visible:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-500/30 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="group/button h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/60 bg-[linear-gradient(145deg,#25cbc9,#1da2be)] py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(29,162,190,0.32),inset_1px_1px_0_rgba(255,255,255,0.35)] transition-all duration-300 hover:brightness-105 hover:shadow-[0_18px_32px_rgba(29,162,190,0.38),inset_1px_1px_0_rgba(255,255,255,0.4)] disabled:opacity-60 dark:border-white/10"
              >
                {isLoading ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin text-white"
                      aria-hidden="true"
                    />
                    <span>Verificando credenciales…</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight
                      className="size-4 text-white transition-transform group-hover/button:translate-x-1"
                      aria-hidden="true"
                    />
                  </>
                )}
              </Button>

              {/* Sandbox Demo: cards con iconos de marca */}
              {demoSandbox ? (
                <div className="mt-2 space-y-3 rounded-2xl border border-teal-200/50 bg-gradient-to-br from-teal-50/60 to-emerald-50/40 p-3.5 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)] dark:border-teal-900/40 dark:from-teal-950/30 dark:to-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      className="size-4 text-teal-600 dark:text-teal-300"
                      aria-hidden="true"
                    />
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">
                      Sandbox Activo
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Entra con un usuario preconfigurado para explorar el
                    producto.
                  </p>

                  <div className="grid gap-2">
                    {ROLE_CARDS.map((role) => {
                      const {
                        key,
                        label,
                        description,
                        Icon,
                        iconClass,
                        ringClass,
                        hoverClass,
                      } = role;
                      const isLogging = quickLoginRole === key;
                      const isOther = quickLoginRole !== null && !isLogging;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleQuickDemoLogin(key)}
                          disabled={quickLoginRole !== null}
                          className={cn(
                            "group/role flex h-auto items-center gap-3 rounded-2xl border border-white/70 bg-white/85 px-3 py-2.5 text-left text-sm shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),4px_4px_12px_rgba(122,176,190,0.08)] transition-all duration-200",
                            hoverClass,
                            isOther && "opacity-50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-[inset_1px_1px_0_rgba(255,255,255,0.95)] transition-transform group-hover/role:scale-105",
                              ringClass
                            )}
                            aria-hidden="true"
                          >
                            <Icon className={cn("size-5", iconClass)} />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {label}
                            </span>
                            <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {description}
                            </span>
                          </span>
                          {isLogging ? (
                            <Loader2
                              className="size-4 shrink-0 animate-spin text-teal-600 dark:text-teal-300"
                              aria-hidden="true"
                            />
                          ) : (
                            <ArrowRight
                              className="size-4 shrink-0 text-slate-300 transition-transform group-hover/role:translate-x-1 group-hover/role:text-teal-600 dark:text-slate-500 dark:group-hover/role:text-teal-300"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {quickLoginRole ? (
                    <p className="text-[11px] text-teal-700 dark:text-teal-300">
                      Conectando al sandbox…
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isDemoEnabled ? (
                <>
                  <div
                    role="separator"
                    className="relative my-5 flex items-center justify-center"
                  >
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200/70 dark:border-slate-700/60" />
                    </div>
                    <span className="relative z-10 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                      o prueba el entorno
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/demo/loading")}
                    className="group/demo h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-teal-200/60 bg-white/80 font-semibold text-teal-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-800 hover:shadow-[0_8px_20px_rgba(20,184,166,0.18)] dark:border-teal-900/40 dark:bg-slate-900/40 dark:text-teal-300 dark:hover:border-teal-700/60 dark:hover:bg-teal-950/30"
                  >
                    <Play
                      className="size-3.5 fill-teal-600 text-teal-600 transition-transform group-hover/demo:scale-110 dark:fill-teal-300 dark:text-teal-300"
                      aria-hidden="true"
                    />
                    <span>Probar Demo Interactiva</span>
                  </Button>
                </>
              ) : null}
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-1.5 border-t border-slate-100/70 pb-6 pt-4 dark:border-slate-800/60">
            <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              Clinicalyx Opencore · Suite Médica Multitenant
            </p>
            <p className="text-center text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Todos los datos se cifran con AES-256-GCM
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
