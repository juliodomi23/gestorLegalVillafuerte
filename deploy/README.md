# GestorLegal — Despliegue en el VPS

Guía para dejar la base de datos y el almacenamiento de documentos listos en el VPS del
despacho (el mismo donde corre `n8n-villafuerte`).

---

## 1. Base de datos Postgres (Docker)

### Requisitos
- Docker y Docker Compose instalados en el VPS (`docker --version`).
- Copiar a una carpeta del VPS estos archivos: `docker-compose.yml`, `.env`, `schema.sql`.

### Pasos
```bash
# 1. Crear el .env real a partir del ejemplo
cp .env.example .env
nano .env                      # poner una contraseña fuerte

# 2. Copiar el schema (de la carpeta del proyecto) junto al compose
#    (el compose lo monta y lo corre solo en el primer arranque)

# 3. Levantar la base
docker compose up -d

# 4. Verificar que está sana
docker compose ps
docker compose logs postgres | tail -20
```

La cadena de conexión para la app y n8n (red local del VPS):
```
postgresql://gestorlegal:TU_PASSWORD@127.0.0.1:5432/gestorlegal
```

> **Seguridad:** el puerto se publica solo en `127.0.0.1`, no en internet. Si la app o n8n
> corren en Docker, conéctalos por nombre de red en vez de localhost.

---

## 2. Respaldo automático (pg_dump diario)

Crear `/opt/gestorlegal/backup.sh`:
```bash
#!/bin/bash
FECHA=$(date +%F)
mkdir -p /opt/gestorlegal/backups
docker exec gestorlegal-db pg_dump -U gestorlegal gestorlegal \
  | gzip > /opt/gestorlegal/backups/gestorlegal_$FECHA.sql.gz
# conservar solo los últimos 14 días
find /opt/gestorlegal/backups -name "*.sql.gz" -mtime +14 -delete
```

Programar en cron (todos los días a las 2:00 am):
```bash
chmod +x /opt/gestorlegal/backup.sh
crontab -e
# agregar:
0 2 * * * /opt/gestorlegal/backup.sh
```

> En datos legales el respaldo no es opcional. Verificar de vez en cuando que los `.sql.gz`
> se estén generando.

---

## 3. Google Drive (service account para subir PDFs)

La web app sube los PDFs al Drive del despacho con una **cuenta de servicio** (no requiere que
nadie inicie sesión cada vez).

### Pasos en Google Cloud
1. Ir a https://console.cloud.google.com → crear (o usar) un proyecto.
2. **APIs y servicios → Biblioteca** → habilitar **Google Drive API**.
3. **Credenciales → Crear credenciales → Cuenta de servicio**. Darle nombre (ej.
   `gestorlegal-drive`).
4. En la cuenta de servicio → **Claves → Agregar clave → JSON**. Se descarga un archivo
   `credenciales.json` (¡guardarlo seguro, NO subir a git!).
5. Copiar el **email** de la cuenta de servicio (algo como
   `gestorlegal-drive@proyecto.iam.gserviceaccount.com`).

### En Google Drive
6. Crear (o ubicar) la **carpeta raíz de expedientes** del despacho.
7. **Compartir** esa carpeta con el email de la cuenta de servicio, permiso **Editor**.
8. Anotar el **ID de la carpeta** (está en la URL de Drive).

La app usará `credenciales.json` + el ID de carpeta para crear una subcarpeta por expediente
y subir ahí los PDFs, guardando el link en la tabla `documentos`.

---

## 4. Checklist de despliegue

- [ ] Docker corriendo en el VPS
- [ ] `.env` con contraseña fuerte
- [ ] `docker compose up -d` y healthcheck en verde
- [ ] Cadena de conexión probada desde la app
- [ ] `backup.sh` en cron y primer respaldo generado
- [ ] Drive API habilitada + service account creada
- [ ] Carpeta de Drive compartida con el email de la service account
- [ ] `credenciales.json` y `.env` fuera de git
