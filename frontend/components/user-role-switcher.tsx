"use client";

// components/user-role-switcher.tsx
//
// Selector de rol de usuario en la barra lateral. Componente
// independiente con `"use client"` explícito y lógica de cambio de
// rol encapsulada. Esto evita problemas de Context cuando se usa
// dentro de Server Components o layouts complejos.
//
// Base UI v1 (librería subyacente al shadcn DropdownMenu):
//   - El `Menu.Trigger` se renderiza como un <button> por defecto.
//   - Para customizar el aspecto, se pasa un elemento como children
//     o como `render={<element />}`. Pasar una FUNCIÓN como
//     `render` rompe el Context interno (Base UI error #31 "Context
//     Missing") porque Base UI espera propagar refs y data-attrs
//     a un elemento React, no invocar una función que devuelve uno.
//   - Por eso este componente usa children directos y NO usa
//     `render`. Es la forma más robusta.
//
// IMPORTANTE — error #31 (MenuGroupContext missing):
//   En este proyecto, `DropdownMenuLabel` envuelve
//   `MenuPrimitive.GroupLabel` (ver components/ui/dropdown-menu.tsx),
//   y GroupLabel REQUIERE un `MenuGroupContext` que solo provee
//   `Menu.Group` (envoltorio `DropdownMenuGroup`). Usar
//   `DropdownMenuLabel` suelto (sin Group padre) lanza:
//     "Base UI error #31: MenuGroupContext is missing. Menu group
//      parts must be used within <Menu.Group> or <Menu.RadioGroup>."
//   Para headers visuales sin items seleccionables (como "Sesión
//   actual"), usamos un <div> estilizado en lugar de Label.
//   Para grupos reales de items (como "Cambiar de rol"), envolvemos
//   el Label y los items en <DropdownMenuGroup>, lo que además
//   habilita roving focus con flechas dentro del grupo.
//
// El componente es un Client Component autocontenido: cualquier
// uso desde un Server Component (e.g. el layout) lo trata como
// un boundary de hidratación sin propagar el Context problemático.

import { useState } from "react";
import { Check, ChevronDown, Loader2, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleIllustration } from "@/components/role-illustration";
import { cn } from "@/lib/utils";

type DemoCredentials = {
  admin_email: string;
  doctor_email: string;
  receptionist_email: string;
  password: string;
};

export type DemoRole = "doctor" | "receptionist" | "admin";

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

const ROLE_ORDER: DemoRole[] = ["doctor", "receptionist", "admin"];

export type UserRoleSwitcherProps = {
  /**
   * Estado del sandbox demo. Si es null, el componente renderiza
   * solo el botón de cerrar sesión. El estado se recibe como prop
   * (no se lee directamente de localStorage) para mantener el
   * componente puro y testeable.
   */
  sandbox: DemoSandboxState | null;
  /**
   * Estado de carga de logout (controlado por el padre para que el
   * sidebar pueda coordinar varios indicadores visuales).
   */
  isLoggingOut?: boolean;
};

export function UserRoleSwitcher({
  sandbox,
  isLoggingOut = false,
}: UserRoleSwitcherProps) {
  const [switchingRole, setSwitchingRole] = useState<DemoRole | null>(null);

  const emailForRole = (role: DemoRole) => {
    if (!sandbox) {
      return "";
    }
    switch (role) {
      case "doctor":
        return sandbox.credentials.doctor_email;
      case "receptionist":
        return sandbox.credentials.receptionist_email;
      case "admin":
        return sandbox.credentials.admin_email;
    }
  };

  const currentRoleLabel = sandbox
    ? ROLE_LABELS[sandbox.currentRole]
    : "Recepcionista";

  const handleSwitchRole = async (role: DemoRole) => {
    if (role !== "doctor" && role !== "receptionist" && role !== "admin") {
      return;
    }

    setSwitchingRole(role);

    try {
      const response = await fetch(
        `/api/demo/start?role=${encodeURIComponent(role)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        const errorMessage =
          payload && typeof payload.error === "string"
            ? payload.error
            : "No se pudo cambiar de rol en el sandbox.";
        throw new Error(errorMessage);
      }

      window.location.replace("/dashboard");
    } catch (error: unknown) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DEMO_STORAGE_KEY);
      }
      const errorMessage =
        error instanceof Error ? error.message : "Error al cambiar de rol.";
      window.location.replace(
        `/login?error=${encodeURIComponent(errorMessage)}`
      );
    } finally {
      setSwitchingRole(null);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    window.location.replace("/login");
  };

  // Verificación defensiva: en entornos donde el sandbox está
  // expirado o ausente, mostramos solo el botón de logout.
  const hasSandbox = sandbox !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Selector de usuario y rol"
            className={cn(
              "flex w-full items-center gap-3 rounded-[18px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-1.5 text-left shadow-[inset_1px_1px_0_rgba(255,255,255,0.08),8px_12px_24px_rgba(4,18,34,0.18)] backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              switchingRole && "opacity-70"
            )}
          />
        }
      >
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#c9fbf7,#7ae6e0)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.85),8px_10px_18px_rgba(5,38,65,0.24)]">
          {hasSandbox && sandbox ? (
            <RoleIllustration
              role={sandbox.currentRole}
              compact
              className="scale-[1.15]"
            />
          ) : (
            <span className="text-sm font-semibold text-[#0f766e]">R</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {currentRoleLabel}
          </p>
        </div>
        <ChevronDown
          className="size-4 text-[#7ae6e0]"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={10}
        className="w-64 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,#0d3b5e_0%,#0a2c47_100%)] p-2 text-white shadow-[0_18px_50px_rgba(0,0,0,0.45),inset_1px_1px_0_rgba(255,255,255,0.08)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(9,18,31,0.98)_100%)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.55),inset_1px_1px_0_rgba(255,255,255,0.05)]"
      >
        {hasSandbox && sandbox ? (
          <>
            {/*
             * "Sesión actual" es solo un encabezado visual (no es un
             * grupo de items seleccionables). Lo renderizamos como un
             * <div> estilizado en lugar de <DropdownMenuLabel> para
             * evitar el error #31 de Base UI: MenuGroupContext missing.
             * <DropdownMenuLabel> en este proyecto envuelve
             * MenuPrimitive.GroupLabel, que requiere un
             * <DropdownMenuGroup> padre. Como este encabezado no
             * contiene items, no podemos darle un Group significativo
             * y un <div> resuelve el problema sin acoplar estructura.
             */}
            <div className="space-y-1 px-2 py-1.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                Sesión actual
              </p>
              <p className="truncate text-xs font-medium text-white/85">
                {emailForRole(sandbox.currentRole)}
              </p>
            </div>
            <DropdownMenuSeparator className="my-1 bg-white/10" />
            {/*
             * "Cambiar de rol" es un grupo real de 3 items
             * seleccionables. Lo envolvemos en <DropdownMenuGroup>
             * (= MenuPrimitive.Group) para:
             *   1. Resolver el error #31: el GroupLabel que viene
             *      después ahora vive dentro del Provider correcto
             *      (MenuGroupContext).
             *   2. Habilitar roving focus nativo de Base UI: las
             *      flechas arriba/abajo ciclarán entre los 3 roles
             *      sin escapar al grupo de logout.
             */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 pt-1 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                Cambiar de rol
              </DropdownMenuLabel>
              {ROLE_ORDER.map((role) => {
                const isCurrentRole = sandbox.currentRole === role;
                const isSwitching = switchingRole === role;
                return (
                  <DropdownMenuItem
                    key={role}
                    render={
                      <button
                        type="button"
                        disabled={switchingRole !== null || isLoggingOut}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-white/85",
                          "focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white",
                          isCurrentRole &&
                            "bg-[linear-gradient(145deg,rgba(216,251,250,0.18),rgba(151,242,236,0.12))] text-[#c9fbf7]"
                        )}
                        onClick={() => {
                          void handleSwitchRole(role);
                        }}
                      />
                    }
                  >
                    <span className="flex items-center gap-2">
                      <RoleIllustration
                        role={role}
                        compact
                        className="size-7 rounded-full"
                      />
                      <span className="font-medium">{ROLE_LABELS[role]}</span>
                    </span>
                    {isCurrentRole ? (
                      <Check
                        className="size-4 text-[#7ae6e0]"
                        aria-hidden="true"
                      />
                    ) : isSwitching ? (
                      <Loader2
                        className="size-4 animate-spin text-white/70"
                        aria-hidden="true"
                      />
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1 bg-white/10" />
            <DropdownMenuItem
              render={
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => {
                    void handleLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-rose-200 focus:bg-rose-500/15 focus:text-rose-100 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-100"
                />
              }
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="font-medium">Cerrar sesión</span>
              {isLoggingOut ? (
                <Loader2
                  className="ml-auto size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            render={
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => {
                  void handleLogout();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-rose-200 focus:bg-rose-500/15 focus:text-rose-100 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-100"
              />
            }
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="font-medium">Cerrar sesión</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
