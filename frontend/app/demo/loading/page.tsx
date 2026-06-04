"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Building,
  KeyRound,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

// Tipado estricto para las credenciales devueltas por el proxy api
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

// Mensajes simulados que cambian dinámicamente en la pantalla de carga
const LOADING_STEPS = [
  "Provisioning isolated sandbox tenant...",
  "Generating cryptographically secure encryption keys...",
  "Encrypting database fields (AES-256-GCM)...",
  "Generating HMAC-SHA256 blind indexes for document IDs...",
  "Seeding mock patients and consultation history...",
  "Scheduling upcoming appointments for today...",
  "Applying PostgreSQL Row-Level Security (RLS) policies...",
  "Issuing ephemeral Doctor session JWT token..."
];

export default function DemoLoadingPage() {
  const router = useRouter();

  // Guardar estado de llamada única en Strict Mode
  const hasFetched = useRef<boolean>(false);

  // Estados de carga e interacción
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<DemoResponse | null>(null);

  // Estado para animar el copiado de credenciales
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Efecto 1: Ciclar textos de carga cada 1200ms
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Efecto 2: Iniciar entorno demo mediante petición POST
  useEffect(() => {
    if (hasFetched.current) return;
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
            "Error al inicializar el entorno de demostración temporal."
          );
        }

        // Guardamos los datos de la demo creada
        setDemoData(data as DemoResponse);
        setIsLoading(false);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo establecer conexión con el servidor.";
        setError(message);
        setIsLoading(false);
      }
    };

    startDemoEnvironment();
  }, []);

  // Función para copiar texto al portapapeles de forma amigable
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0c] overflow-hidden font-sans text-slate-200 p-4">
      {/* Fondo con gradientes premium consistentes */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#1e1b4b] to-[#311042] opacity-35 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#0f172a] to-[#022c22] opacity-30 blur-[120px]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 w-full max-w-[580px] p-2">
        {/* 1. ESTADO DE CARGA */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
              {/* Spinner animado decorativo exterior */}
              <div className="absolute w-24 h-24 rounded-full border border-slate-800 border-t-emerald-500 animate-spin duration-1000" />
              {/* Icono central de actividad clínica */}
              <div className="w-16 h-16 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-pulse">
                <Activity className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Creando Entorno Efímero
              </h2>
              <div className="h-6 flex items-center justify-center">
                <p className="text-sm text-slate-400 font-medium transition-all duration-300 animate-pulse">
                  {LOADING_STEPS[stepIndex]}
                </p>
              </div>
            </div>

            {/* Barra de progreso visual abstracta */}
            <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* 2. ESTADO DE ERROR */}
        {!isLoading && error && (
          <Card className="border-red-950/60 bg-slate-950/60 backdrop-blur-xl shadow-2xl p-2 animate-in scale-in duration-300">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-red-950/30 border border-red-900/40 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle className="text-lg font-bold text-white">
                Fallo al inicializar demo
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                La solicitud de creación de entorno ha sido denegada.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <p className="text-sm text-slate-300 bg-red-950/10 border border-red-950/40 p-4 rounded-lg font-medium leading-relaxed">
                {error.includes("Too many requests") || error.includes("429")
                  ? "Límite de solicitudes excedido por seguridad IP (Anti-DDoS). Por favor, espere 1 hora para intentarlo de nuevo."
                  : error}
              </p>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-slate-900/80 pt-4">
              <Button
                onClick={() => router.push("/login")}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-medium px-6 py-5 rounded-lg cursor-pointer transition-colors"
              >
                Volver al Login
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* 3. PANTALLA DE ÉXITO Y CREDENCIALES */}
        {!isLoading && !error && demoData && (
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-white tracking-tight">
                ¡Tu sandbox está listo!
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Se ha generado un entorno clínico temporal (Sandbox aislado por RLS)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Información General del Tenant */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-900 bg-slate-950/60 text-xs text-slate-400 font-medium">
                <Building className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">
                  <strong>Demo Tenant:</strong> {demoData.tenant_id}
                </span>
                <button
                  onClick={() => handleCopy(demoData.tenant_id, "tenant")}
                  className="ml-auto p-1 hover:bg-slate-900 rounded transition-colors text-slate-500 hover:text-slate-300"
                  title="Copiar Tenant ID"
                >
                  {copiedField === "tenant" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Contraseña compartida */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-900 bg-slate-950/60 text-xs text-slate-400 font-medium">
                <KeyRound className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>Contraseña común:</strong> <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white text-xs font-mono">{demoData.credentials.password}</code>
                </span>
                <button
                  onClick={() => handleCopy(demoData.credentials.password, "password")}
                  className="ml-auto p-1 hover:bg-slate-900 rounded transition-colors text-slate-500 hover:text-slate-300"
                  title="Copiar Contraseña"
                >
                  {copiedField === "password" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Tarjetas de Credenciales */}
              <div className="grid grid-cols-1 gap-2.5 mt-2">
                {/* 1. DOCTOR (Sesión activa) */}
                <div className="relative group border border-emerald-500/30 bg-emerald-950/5 p-3 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-emerald-500/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        DOCTOR
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 animate-pulse bg-emerald-500/20 px-1.5 py-0.5 rounded">
                        <UserCheck className="w-3 h-3" />
                        Autologin Activo
                      </span>
                    </div>
                    <p className="text-xs font-mono text-white font-medium mt-1">
                      {demoData.credentials.doctor_email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(demoData.credentials.doctor_email, "doctor")}
                    className="p-2 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {copiedField === "doctor" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* 2. RECEPCIONISTA */}
                <div className="group border border-slate-900 bg-slate-950/20 p-3 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-slate-800">
                  <div className="space-y-0.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        RECEPTIONIST
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 font-medium mt-1">
                      {demoData.credentials.receptionist_email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(demoData.credentials.receptionist_email, "receptionist")}
                    className="p-2 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {copiedField === "receptionist" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* 3. SUPERADMIN */}
                <div className="group border border-slate-900 bg-slate-950/20 p-3 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-slate-800">
                  <div className="space-y-0.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                        SUPERADMIN
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 font-medium mt-1">
                      {demoData.credentials.admin_email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(demoData.credentials.admin_email, "admin")}
                    className="p-2 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {copiedField === "admin" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Advertencia de expiración */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-yellow-900/30 bg-yellow-950/10 text-yellow-500 text-[11px] font-medium leading-normal">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-yellow-500" />
                <span>
                  Este sandbox tiene políticas de destrucción automática. Toda la información será purgada por el Grim Reaper en un periodo de 2 horas.
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-3 pb-6 border-t border-slate-900/80">
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold transition-all duration-300 py-5 rounded-lg shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Enter System</span>
                <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
