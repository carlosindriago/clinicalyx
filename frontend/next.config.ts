import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  
  // Optimizaciones para producción
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Desactivar verificaciones durante build para ahorrar RAM
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimizaciones de memoria para evitar OOM Killer
  experimental: {
    memoryBasedWorkersCount: true,
  },
  
  // Headers de seguridad
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
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
