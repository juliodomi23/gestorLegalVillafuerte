# GestorLegal — imagen de producción de la app Next.js
# Multi-stage: build con devDeps, runtime solo con lo necesario para `next start`.

# ---- builder ----
FROM node:22-slim AS builder
WORKDIR /app

# Prisma necesita openssl
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

# Cambia BUILDTIME en el environment de EasyPanel para forzar un rebuild sin caché
ARG BUILDTIME=unknown
RUN echo "Build: ${BUILDTIME}"

COPY . .

# DATABASE_URL placeholder solo para que `prisma generate`/build no falle por env ausente
# (no se conecta en build; la real la inyecta docker-compose en runtime).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
RUN npm run build

# ---- runner ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
