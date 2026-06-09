# GestorLegal — App (Next.js)

Frontend + backend (full-stack) del gestor de expedientes. Stack: Next.js 14 (App Router) +
Tailwind + Prisma + PostgreSQL. Diseño "Expediente moderno" (ver `../sistema-diseno.md`).

## Arrancar en local

```bash
cd web
npm install

# 1. Configurar la conexión a la BD
cp .env.example .env
#    edita DATABASE_URL (en desarrollo, túnel SSH al Postgres del VPS:
#    ssh -L 5432:127.0.0.1:5432 usuario@vps)

# 2. Generar el cliente de Prisma
npx prisma generate
#    (opcional, si la BD ya existe con schema.sql: npx prisma db pull && npx prisma generate)

# 3. Levantar
npm run dev
```

Abre http://localhost:3000 → redirige a `/inicio` (el dashboard).

## Estructura

```
web/
├── prisma/schema.prisma     # modelos (espejo de ../schema.sql)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # fuentes (EB Garamond + Lato) y estilos globales
│   │   ├── page.tsx          # redirige a /inicio
│   │   ├── globals.css       # tokens y utilidades (.num, .eyebrow, .exp-no)
│   │   └── (app)/            # área autenticada con sidebar + topbar
│   │       ├── layout.tsx
│   │       ├── inicio/       # dashboard (portado del prototipo)
│   │       ├── expedientes/  # (stub) siguiente módulo
│   │       ├── agenda/  clientes/  caja/  configuracion/
│   ├── components/
│   │   ├── sidebar.tsx       # navegación con estado activo por ruta
│   │   └── topbar.tsx
│   └── lib/prisma.ts         # cliente Prisma (singleton)
└── tailwind.config.ts        # tokens del sistema de diseño
```

## Pendiente (siguientes pasos)
- Conectar el dashboard a datos reales (Prisma queries en server components).
- Portar Expedientes (lista + ficha con tabs) desde `../prototipo.html`.
- Auth con Auth.js (roles admin/abogado/asistente).
- Subida de PDF a Google Drive (service account, ver `../deploy/README.md`).
- Endpoints para que n8n escriba expedientes/asesorías/caja.
