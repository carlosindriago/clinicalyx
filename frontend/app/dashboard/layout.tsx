import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseRoleFromAccessToken } from "@/lib/backend";
import { DashboardShell } from "./dashboard-shell";

/**
 * Layout server component del dashboard.
 *
 * SEGURIDAD: el rol del usuario se deriva del JWT firmado (cookie
 * access_token) en el SERVIDOR. No se lee del localStorage ni se
 * expone al cliente para que este lo manipule. Se usa únicamente
 * para decidir si se redirige a /login o se renderiza el shell.
 *
 * La insignia visible de rol y los quick actions del header (que
 * antes vivían en DashboardShell) migraron a DashboardPage, que los
 * lee del sandbox demo (localStorage) para mantener una única
 * fuente de verdad con el resto del contenido de la página.
 *
 * El parseo NO verifica la firma (es solo decodificación de base64url
 * para extraer el claim role). La verificación criptográfica la hace
 * el backend en cada endpoint protegido por RequireRole. Por lo tanto,
 * un atacante que manipule el payload del JWT no escala privilegios:
 * su JWT modificado será rechazado por la verificación de firma del
 * backend en cada request.
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

  return <DashboardShell>{children}</DashboardShell>;
}
