import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Genera un nonce criptográficamente aleatorio (base64) por request.
 * Se usa para CSP: el navegador solo ejecuta scripts/estilos cuyo
 * nonce coincida con el del header CSP, mitigando XSS.
 *
 * Documentación de referencia: Next.js Content Security Policy guide
 * (Context7 /vercel/next.js → docs/01-app/02-guides/content-security-policy.mdx).
 */
function generateNonce(): string {
  // crypto.getRandomValues está disponible en el edge runtime de Next.js.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convertir a base64 estándar para usarlo en el header CSP.
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Construye el header Content-Security-Policy.
 *
 * Política estricta (production):
 *  - default-src 'self': solo recursos del mismo origen por defecto
 *  - script-src 'self' 'nonce-...' 'strict-dynamic': solo scripts con
 *    nonce explícito; 'strict-dynamic' permite que los scripts
 *    cargados por un script de confianza hereden la confianza
 *  - style-src 'self' 'unsafe-inline': necesario por Tailwind 4 / shadcn
 *    que inyectan <style> inline en runtime. Sin 'unsafe-inline' los
 *    estilos se rompen en build. Trade-off documentado.
 *  - img-src 'self' blob: data: https:: imágenes self, blobs de
 *    preview, data URIs (avatares SVG inline) y HTTPS genérico (para
 *    avatares de proveedores externos si se añaden en el futuro)
 *  - connect-src 'self' <BACKEND>: solo fetch/XHR al mismo origen y al
 *    backend configurado
 *  - font-src 'self' data:: fuentes self y data URIs (algunos iconos)
 *  - object-src 'none': bloquea <object>/<embed>/<applet>
 *  - base-uri 'self': previene <base href> injection
 *  - form-action 'self': solo forms al mismo origen
 *  - frame-ancestors 'none': equivalente a X-Frame-Options: DENY
 *  - upgrade-insecure-requests: HTTP → HTTPS automático
 *
 * En desarrollo se añade 'unsafe-eval' para HMR de React/Next.
 */
function buildCSP(nonce: string, isDev: boolean): string {
  const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:8080";
  // Extraer el origen (scheme + host) del BACKEND_API_URL para connect-src.
  let backendOrigin = "";
  try {
    backendOrigin = new URL(backendApiUrl).origin;
  } catch {
    // Si la URL es inválida, no añadimos nada extra a connect-src.
    // El default-src 'self' seguirá aplicando.
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", "https:"],
    "font-src": ["'self'", "data:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  if (backendOrigin) {
    directives["connect-src"] = ["'self'", backendOrigin];
  } else {
    directives["connect-src"] = ["'self'"];
  }

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(" ")}` : key
    )
    .join("; ");
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isAuthenticated = Boolean(accessToken);

  // Generar nonce y construir CSP para esta request.
  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCSP(nonce, isDev);

  // Inyectar nonce en los request headers para que Server Components
  // y scripts que lo necesiten puedan leerlo de x-nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Construir la respuesta con los headers inyectados en request.
  // Esto hace que `headers()` de next/headers devuelva el nonce.
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Aplicar CSP a la response.
  response.headers.set("Content-Security-Policy", csp);

  // Lógica de redirección (existente).
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    // Aplicar a TODAS las rutas excepto assets estáticos e imágenes.
    // El middleware añade un header de seguridad a cada response sin
    // coste significativo (~1ms por request).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
