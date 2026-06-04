"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Activity, 
  ArrowRight,
  AlertCircle,
  Play
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
  CardTitle 
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  
  // Estados del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
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

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0c] overflow-hidden font-sans">
      {/* Fondo con gradientes premium y animaciones sutiles */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#1e1b4b] to-[#311042] opacity-30 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#0f172a] to-[#022c22] opacity-25 blur-[120px]" />
      
      {/* Líneas de red decorativas que transmiten tecnología médica */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 w-full max-w-[460px] p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Cabecera / Marca */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-3">
            <Activity className="w-full h-full text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Clinicalyx
          </h1>
          <p className="text-slate-400 text-sm mt-1 text-center font-medium">
            SaaS de Gestión Clínica e Historias Médicas
          </p>
        </div>

        {/* Tarjeta de Login con Glassmorphism */}
        <Card className="border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl font-bold text-white text-center">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-slate-400 text-center text-sm">
              Ingresa los accesos de tu organización
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Alerta de Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}



              {/* Input de Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="doctor@clinicalyx.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-900/60 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Input de Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Contraseña
                  </Label>
                  <a href="#" className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition-colors font-medium">
                    ¿La olvidaste?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-900/60 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón de Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold transition-all duration-300 py-5 rounded-lg shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 group cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              {process.env.NEXT_PUBLIC_ENABLE_EPHEMERAL_DEMO === "true" && (
                <>
                  {/* Divisor Visual */}
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800/80" />
                    </div>
                    <span className="relative z-10 bg-[#0d0d11] px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      o accede al sandbox
                    </span>
                  </div>

                  {/* Botón Interactivo de Demo */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/demo/loading")}
                    className="w-full border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-950/20 text-emerald-400 font-semibold transition-all duration-300 py-5 rounded-lg flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Try Interactive Demo</span>
                  </Button>
                </>
              )}
            </form>
          </CardContent>

          <CardFooter className="pt-2 pb-6 border-t border-slate-900/80 flex justify-center">
            <p className="text-slate-500 text-xs font-medium text-center">
              Clinicalyx Opencore SaaS. Todos los derechos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
