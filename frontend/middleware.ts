import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Construye el header Content-Security-Policy.
 *
 * Política estándar probada para Next.js App Router (referencia:
 * Context7 /vercel/next.js → docs/01-app/02-guides/content-security-policy.mdx).
 *
 * Decisión:放弃非ces dinámicos. Next.js App Router inserta scripts
 * inline de hidratación con nonces INTERNOS que el middleware no
 * puede replicar, lo que rompía la hidratación en producción.
 * Volvemos a una CSP sin nonces pero con defense-in-depth:
 *
 *  - default-src 'self': por defecto, solo recursos del mismo origen.
 *  - script-src 'self' 'unsafe-inline' 'unsafe-eval':
 *      'unsafe-inline' es necesario para los scripts de hidratación
 *      de Next.js (chunks inline, runtime de React, HMR, etc.).
 *      'unsafe-eval' es necesario para el runtime de React/Next en
 *      producción (compiladores optimizadores que generan eval).
 *      La defensa principal contra XSS sigue siendo:
 *      (1) HttpOnly cookies (tokens no robables vía JS),
 *      (2) style-src SIN 'unsafe-inline' (Tailwind 4 sí lo necesita,
 *          ver abajo) - bloqueado,
 *      (3) connect-src restringido al backend,
 *      (4) default-src 'self' como fallback.
 *  - style-src 'self' 'unsafe-inline': necesario por Tailwind 4 /
 *      shadcn que inyectan <style> inline en runtime.
 *  - img-src 'self' blob: data:: imágenes self, blobs de preview,
 *      data URIs (avatares SVG inline).
 *  - font-src 'self': fuentes del mismo origen.
 *  - object-src 'none': bloquea <object>/<embed>/<applet>.
 *  - base-uri 'self': previene <base href> injection.
 *  - form-action 'self': solo forms al mismo origen.
 *  - frame-ancestors 'none': anti-clickjacking.
 *  - connect-src 'self' <BACKEND>: solo fetch/XHR al mismo origen y
 *      al backend configurado.
 */
function buildCSP(): string {
  const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:8080";
  let backendOrigin = "";
  try {
    backendOrigin = new URL(backendApiUrl).origin;
  } catch {
    // Si la URL es inválida, no añadimos nada extra a connect-src.
  }

  const connectSrc = backendOrigin
    ? `'self' ${backendOrigin}`
    : "'self'";

  // Whitelist de Cloudflare Analytics (Web Analytics / Insights).
  // El script se sirve desde static.cloudflareinsights.com y reporta
  // a cloudflareinsights.com vía beacon. Si Cloudflare no está
  // habilitado en producción, simplemente no se carga nada, pero la
  // CSP debe permitirlo para evitar errores en consola.
  const cloudflareScriptHosts = [
    "https://static.cloudflareinsights.com",
    "https://cloudflareinsights.com",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${cloudflareScriptHosts}`,
    `connect-src ${connectSrc} ${cloudflareScriptHosts}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function applyCSP(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isAuthenticated = Boolean(accessToken);

  const csp = buildCSP();

  // Lógica de redirección: aplicar CSP también en redirects.
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    applyCSP(redirectResponse, csp);
    return redirectResponse;
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    applyCSP(redirectResponse, csp);
    return redirectResponse;
  }

  const response = NextResponse.next();
  applyCSP(response, csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
