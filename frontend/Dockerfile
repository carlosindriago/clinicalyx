# Stage 1: Dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar archivos de definición de dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Compilación (Build)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js recolecta telemetría anónima de manera predeterminada. Deshabilitarla.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Ejecutar compilación de producción
RUN npm run build

# Stage 3: Ejecución (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Setear los permisos adecuados para la carpeta de caché .next
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Optimizar el runner copiando el build standalone (si está habilitado en next.config.js)
# O copiando los directorios necesarios por defecto
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando de inicio
CMD ["node", "server.js"]
