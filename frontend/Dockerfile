# Stage 1: Dependencias - Ultra ligero
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar solo archivos necesarios para instalar dependencias
COPY package.json package-lock.json ./
RUN npm ci --only=production --omit=dev

# Stage 2: Compilación - Optimizado para cache
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para build optimizado
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build de producción con standalone mode
RUN npm run build

# Stage 3: Ejecución - Imagen final ultra ligera
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar solo lo necesario para producción
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Configurar permisos
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check para Coolify
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Comando de inicio obligatorio para standalone
CMD ["node", "server.js"]
