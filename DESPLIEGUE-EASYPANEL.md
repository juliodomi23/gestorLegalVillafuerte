# GestorLegal — Despliegue en EasyPanel

Levanta **todo** (app Next.js + PostgreSQL) con un solo `docker-compose.yml`.

## Estructura que espera el compose
```
GestorLegal/
├── docker-compose.yml      ← lo que EasyPanel levanta
├── .env.example            ← variables (copiar a Environment en EasyPanel)
├── schema.sql              ← se ejecuta solo en el primer arranque de la BD
└── web/                    ← la app (tiene su Dockerfile)
```
Sube **toda la carpeta `GestorLegal/`** como repositorio Git (o como fuente del servicio).

## Pasos en EasyPanel

1. **Crear proyecto** (ej. `gestorlegal-villafuerte`).
2. **Crear servicio → tipo "Compose"**, conectándolo al repo que contiene este `docker-compose.yml`.
3. **Environment** del proyecto: pega las variables del `.env.example` con valores reales:
   - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
   - `NEXTAUTH_URL` = el dominio que vas a asignar (ej. `https://gestorlegal.ambarrojo.cloud`)
   - `NEXTAUTH_SECRET` = `openssl rand -base64 32`
   - `N8N_API_KEY` = una clave larga (la usará n8n en el header `x-api-key`)
4. **Deploy.** EasyPanel construye la imagen de `web/` y levanta `db` + `app`.
5. **Dominio:** en el servicio `app`, asigna el dominio apuntando al **puerto 3000**.
   EasyPanel pone el HTTPS (Let's Encrypt) automáticamente.

## Verificar
- Entra al dominio → debe redirigir a `/login`.
- Login de prueba: `christian@villafuerte.mx` / `demo1234`.
- Probar un endpoint de n8n:
  ```bash
  curl -X GET "https://TU_DOMINIO/api/n8n/usuarios?telefono=9612683551" \
    -H "x-api-key: TU_N8N_API_KEY"
  ```

## Notas importantes
- **El `schema.sql` solo corre la primera vez** (cuando el volumen `gestorlegal_data` está vacío).
  Si cambias el schema después, hay que aplicar la migración a mano o recrear el volumen.
- **Backups:** configura un `pg_dump` diario (ver `deploy/README.md`). En datos legales no es opcional.
- **Login:** por ahora los usuarios viven en código (`web/src/lib/usuarios.ts`). Migrar a la
  tabla `usuarios` con contraseña encriptada es el pendiente de auth para prod.
- **El front aún usa datos de ejemplo**; los endpoints de n8n sí escriben a la BD. Conectar el
  front a la base es el siguiente paso.

## Una instancia por despacho
Para otro bufete: nuevo proyecto en EasyPanel con su propio `.env` (otra BD, otro dominio,
otra `N8N_API_KEY`). Mismo repo, datos totalmente aislados.
