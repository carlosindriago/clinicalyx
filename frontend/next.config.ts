import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",

  // Optimizaciones para producción
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // La verificación de tipos es OBLIGATORIA en el build. Cualquier
  // error de TypeScript debe abortar el build. La política zero-any
  // del proyecto se enforce a través de esta verificación.
  //
  // Antes: ignoreBuildErrors: true (silenciaba errores en producción).
  // Esto permitía que código inseguro o con tipos incorrectos llegase
  // a producción, contradiciendo la política del proyecto.
  //
  // Nota: la propiedad typescript.ignoreBuildErrors se ha eliminado
  // intencionalmente. El default es false (verificar tipos).
  //
  // Optimizaciones de memoria para evitar OOM Killer (sin relación con
  // verificación de tipos, se mantiene para builds con poca RAM).
  experimental: {
    memoryBasedWorkersCount: true,
  },

  // Headers de seguridad. CSP se aplica en middleware.ts con nonce
  // dinámico por request (no es práctico aquí porque no podemos
  // generar nonces únicos en build-time).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            // Permissions-Policy: deshabilita APIs sensibles que la
            // app no necesita (cámara, micrófono, geolocalización, etc.).
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
