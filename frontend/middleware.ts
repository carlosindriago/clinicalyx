import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Genera un nonce criptográficamente aleatorio (base64) por request.
 * Se inyecta en x-nonce para que el código que use next/script con
 * nonce={...} pueda leerlo y aplicarlo a sus <script> tags.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Construye el header Content-Security-Policy.
 *
 * Política de seguridad (referencia: Context7 /vercel/next.js →
 * docs/01-app/02-guides/content-security-policy.mdx):
 *
 *  - default-src 'self': por defecto, solo recursos del mismo origen.
 *  - script-src 'self' 'nonce-...' 'unsafe-inline' 'strict-dynamic':
 *      Next.js App Router inserta scripts inline de hidratación con
 *      nonces INTERNOS que no podemos replicar desde el middleware.
 *      Para no romper la hidratación de la app en producción,
 *      combinamos el nonce (para nuestros <Script> propios) con
 *      'unsafe-inline' (necesario para los chunks de Next) y
 *      'strict-dynamic' (permite que scripts cargados por uno de
 *      confianza hereden la confianza, mitigando parcialmente el
 *      unsafe-inline). La capa principal de defensa contra XSS es
 *      HttpOnly en las cookies de sesión: los tokens no son robables
 *      vía JavaScript aunque un atacante inyecte un <script>.
 *  - style-src 'self' 'unsafe-inline': necesario por Tailwind 4 /
 *      shadcn que inyectan <style> inline en runtime.
 *  - img-src 'self' blob: data: https:: imágenes self, blobs de
 *      preview, data URIs (avatares SVG inline) y HTTPS genérico.
 *  - connect-src 'self' <BACKEND>: solo fetch/XHR al mismo origen y
 *      al backend configurado.
 *  - font-src 'self' data:: fuentes self y data URIs.
 *  - object-src 'none': bloquea <object>/<embed>/<applet>.
 *  - base-uri 'self': previene <base href> injection.
 *  - form-action 'self': solo forms al mismo origen.
 *  - frame-ancestors 'none': anti-clickjacking (equivalente a X-Frame-Options: DENY).
 *  - upgrade-insecure-requests: HTTP → HTTPS automático.
 *
 * En desarrollo se añade 'unsafe-eval' para HMR de React/Next.
 */
function buildCSP(nonce: string, isDev: boolean): string {
  const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:8080";
  let backendOrigin = "";
  try {
    backendOrigin = new URL(backendApiUrl).origin;
  } catch {
    // Si la URL es inválida, no añadimos nada extra a connect-src.
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'",
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

function applyCSP(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isAuthenticated = Boolean(accessToken);

  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCSP(nonce, isDev);

  // Inyectar nonce en request headers para que el código que lea
  // headers() de next/headers pueda obtenerlo y aplicarlo a <Script>.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

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

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyCSP(response, csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
