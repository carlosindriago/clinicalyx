"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  HeartPulse, 
  ArrowRight,
  AlertCircle,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleIllustration } from "@/components/role-illustration";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

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

const ROLE_LABELS: Record<DemoRole, string> = {
  admin: "Superadmin",
  doctor: "Doctor",
  receptionist: "Recepcionista",
};

export default function LoginPage() {
  const router = useRouter();
  
  // Estados del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDemoEnabled, setIsDemoEnabled] = useState(false);
  const [demoSandbox, setDemoSandbox] = useState<DemoSandboxState | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [quickLoginRole, setQuickLoginRole] = useState<DemoRole | null>(null);
  
  // Estados de UI
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
        setTenantId(parsed.tenantId);
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
          ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Credenciales inválidas o error de red");
      }

      // Redirigir al dashboard tras login exitoso
      router.push("/dashboard");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al intentar iniciar sesión";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 font-sans">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-[8%] top-16 h-64 w-64 rounded-full bg-teal-100/80 blur-3xl" />
        <div className="absolute right-[10%] top-24 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-white blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,#000_68%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[460px] p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#d8fbfa,#97f2ec)] text-teal-600 shadow-[0_10px_30px_rgba(20,184,166,0.16)]">
            <HeartPulse className="size-7 stroke-[2.4]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Clinicalyx
          </h1>
          <p className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Medical Suite
          </p>
          <p className="mt-3 text-center text-sm font-medium text-slate-500">
            Tu Portal Médico Multitenant Seguro
          </p>
        </div>

        <Card className="rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.03)]">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-center text-xl font-bold text-slate-800">
              Inicia sesión
            </CardTitle>
            <CardDescription className="text-center text-sm text-slate-500">
              Ingresa los accesos de tu organización
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Alerta de Error */}
              {error && (
                <div className="animate-in fade-in slide-in-from-top-2 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 duration-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}



              {/* Input de Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="doctor@clinicalyx.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Input de Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contraseña
                  </Label>
                  <a href="#" className="text-xs font-medium text-teal-600 transition-colors hover:text-teal-700 hover:underline">
                    ¿La olvidaste?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón de Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(145deg,#25cbc9,#1da2be)] py-5 font-bold text-white shadow-[0_14px_28px_rgba(29,162,190,0.18)] transition-all duration-300 hover:brightness-105"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>

              {demoSandbox && (
                <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/80 p-3 text-xs text-slate-600">
                  <div className="space-y-1">
                    <p className="font-semibold uppercase tracking-wider text-teal-700">
                      Sandbox Demo Activo
                    </p>
                    <p className="break-all font-mono text-[11px] text-slate-500">
                      Tenant: {demoSandbox.tenantId}
                    </p>
                    <p className="text-slate-500">
                      Este login reutiliza el tenant efímero del sandbox para que puedas entrar con cualquiera de los 3 usuarios.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleQuickDemoLogin("doctor")}
                      disabled={quickLoginRole !== null}
                      className="h-auto justify-between rounded-2xl border-teal-200 bg-white py-2 text-teal-700 hover:bg-teal-50"
                    >
                      <span className="flex items-center gap-2">
                        <RoleIllustration role="doctor" compact className="size-8" />
                        <span>Entrar como Doctor</span>
                      </span>
                      <span className="font-mono text-[10px]">{demoSandbox.credentials.doctor_email}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleQuickDemoLogin("receptionist")}
                      disabled={quickLoginRole !== null}
                      className="h-auto justify-between rounded-2xl border-slate-200 bg-white py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        <RoleIllustration role="receptionist" compact className="size-8" />
                        <span>Entrar como Recepcionista</span>
                      </span>
                      <span className="font-mono text-[10px]">{demoSandbox.credentials.receptionist_email}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleQuickDemoLogin("admin")}
                      disabled={quickLoginRole !== null}
                      className="h-auto justify-between rounded-2xl border-slate-200 bg-white py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        <RoleIllustration role="admin" compact className="size-8" />
                        <span>Entrar como Superadmin</span>
                      </span>
                      <span className="font-mono text-[10px]">{demoSandbox.credentials.admin_email}</span>
                    </Button>
                  </div>

                  {quickLoginRole && (
                    <p className="text-[11px] text-teal-700">
                      Conectando al sandbox con el usuario {ROLE_LABELS[quickLoginRole].toLowerCase()}...
                    </p>
                  )}
                </div>
              )}

              {isDemoEnabled && (
                <>
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative z-10 bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      o accede al sandbox
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/demo/loading")}
                    className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-teal-200 bg-white font-semibold text-teal-700 transition-all duration-300 hover:border-teal-300 hover:bg-teal-50"
                  >
                    <Play className="h-3.5 w-3.5 fill-teal-600 text-teal-600 transition-transform group-hover:scale-110" />
                    <span>Probar Demo Interactiva</span>
                  </Button>
                </>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-slate-100 pb-6 pt-2">
            <p className="text-center text-xs font-medium text-slate-500">
              Clinicalyx Opencore SaaS. Todos los derechos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
