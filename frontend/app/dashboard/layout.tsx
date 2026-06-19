import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  parseRoleFromAccessToken,
  type AppRole,
} from "@/lib/backend";
import { DashboardShell } from "./dashboard-shell";

/**
 * Layout server component del dashboard.
 *
 * SEGURIDAD: el rol del usuario se deriva del JWT firmado (cookie
 * access_token) en el SERVIDOR. No se lee del localStorage ni se
 * expone al cliente para que este lo manipule.
 *
 * El parseo NO verifica la firma (es solo decodificación de base64url
 * para extraer el claim role). La verificación criptográfica la hace
 * el backend en cada endpoint protegido por RequireRole. Por lo tanto,
 * un atacante que manipule el payload del JWT no escala privilegios:
 * su JWT modificado será rechazado por la verificación de firma del
 * backend en cada request.
 *
 * Si no hay token, redirige a /login (defense-in-depth: el middleware
 * también lo hace, pero el layout es la barrera final antes del render).
 */
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const role = parseRoleFromAccessToken(token);

  if (!role) {
    redirect("/login");
  }

  return <DashboardShell currentRole={role as AppRole}>{children}</DashboardShell>;
}
