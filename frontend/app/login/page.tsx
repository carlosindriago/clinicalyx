"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
