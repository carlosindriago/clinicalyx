"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  Users, 
  Calendar, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  TrendingUp,
  FileText,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Llamada al proxy de logout para limpiar cookies y revocar sesión
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setIsLoggingOut(false);
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans flex flex-col">
      {/* Header Superior */}
      <header className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Activity className="w-full h-full text-slate-950 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Clinicalyx
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-950 bg-emerald-950/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sesión Segura Activa</span>
            </div>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-lg text-sm flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Banner de Bienvenida */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950 to-slate-900/60 p-8 shadow-xl">
          <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-emerald-500 opacity-5 blur-[100px]" />
          <div className="relative z-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Portal Clínico</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              ¡Bienvenido, estás autenticado!
            </h2>
            <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
              El flujo de autenticación E2E se ha completado. Tu identidad ha sido verificada y las cookies cifradas <code className="text-emerald-400 bg-slate-900/80 px-1.5 py-0.5 rounded font-mono text-xs">HttpOnly</code> de acceso están instaladas de manera segura en tu navegador.
            </p>
          </div>
        </div>

        {/* Indicadores Clínicos Clave (Placeholder Premium) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Pacientes */}
          <div className="border border-slate-850 bg-slate-950/20 rounded-xl p-6 hover:border-emerald-500/20 transition-all group duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-450 uppercase tracking-wider">Pacientes Totales</span>
              <div className="w-10 h-10 rounded-lg bg-indigo-950/40 text-indigo-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">1,248</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5 bg-emerald-950/30 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3" />
                +12%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Búsqueda cifrada y RLS activo</p>
          </div>

          {/* Card Citas */}
          <div className="border border-slate-850 bg-slate-950/20 rounded-xl p-6 hover:border-emerald-500/20 transition-all group duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-450 uppercase tracking-wider">Citas Hoy</span>
              <div className="w-10 h-10 rounded-lg bg-emerald-950/40 text-emerald-450 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">18</span>
              <span className="text-xs text-slate-400">programadas</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Sincronización en tiempo real</p>
          </div>

          {/* Card Auditoría */}
          <div className="border border-slate-850 bg-slate-950/20 rounded-xl p-6 hover:border-emerald-500/20 transition-all group duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-450 uppercase tracking-wider">Cumplimiento HIPAA</span>
              <div className="w-10 h-10 rounded-lg bg-teal-950/40 text-teal-450 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">100%</span>
              <span className="text-xs font-semibold text-teal-400 bg-teal-950/30 px-1.5 py-0.5 rounded">Verificado</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Logs WORM e inmutabilidad activa</p>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="border border-slate-850 bg-slate-950/10 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-200">Módulos Clínicos Disponibles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition-all cursor-not-allowed group">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-500" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-400">Historias Clínicas</h4>
                  <p className="text-xs text-slate-600">Modelado inyectable JSONB</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition-all cursor-not-allowed group">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-slate-500" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-400">Libro Diario Contable</h4>
                  <p className="text-xs text-slate-600">Double-Entry Ledger decimal</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-950 bg-[#070709] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-655 font-medium">
          Clinicalyx Opencore SaaS &copy; 2026. Diseñado para alta disponibilidad y seguridad médica.
        </div>
      </footer>
    </div>
  );
}
