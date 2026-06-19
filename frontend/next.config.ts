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
            // HSTS: max-age de 1 año (31536000s) es el valor recomendado
            // por Mozilla Observatory y suficiente para que los
            // navegadores mantengan HTTPS-only durante una release cycle.
            // includeSubDomains aplica la política a todos los subdominios.
            // preload permite enviar el dominio a la lista de HSTS preload
            // de los navegadores (compromiso de 1 año mínimo al enviar).
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
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
            // Referrer-Policy estricto: solo envía el origen (sin path)
            // en cross-origin requests, y el origen completo en
            // same-origin. Nunca la URL completa a terceros.
            // Cumple con la guía de Mozilla Observatory.
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Cross-Origin-Resource-Policy: indica a los navegadores
            // que estos recursos solo deben cargarse desde el mismo
            // origen. Previene ataques de side-channel (Spectre) y
            // filtraciones cross-origin via <img>, <script>, <iframe>.
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
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
