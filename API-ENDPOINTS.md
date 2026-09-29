# GestorLegal — API para n8n

Endpoints que consumen los bots de WhatsApp (n8n) para escribir/leer en la base de datos.
Reemplazan las tools que hoy escriben a Google Sheets.

**Base URL (prod):** `https://gestorlegal.villafuerte.mx` (o la que se asigne)
**Autenticación:** header `x-api-key: <N8N_API_KEY>` en **todas** las llamadas.
**Respuestas:** `{ "ok": true, "data": ... }` o `{ "ok": false, "error": "..." }`.

> Los campos de nombre (cliente, abogado, sucursal) se mandan como texto; el backend los
> resuelve a IDs solo. Las fechas aceptan `dd/MM/yyyy` o ISO.

---

## Escritura (POST)

### `POST /api/n8n/expedientes` — registrar expediente
```json
{
  "cliente": "Juan Pérez",
  "telefonoCliente": "9611234567",
  "numeroJudicial": "542/2026",
  "materia": "Mercantil",
  "tipoJuicio": "Ordinario mercantil",
  "juzgado": "Juzgado 3.º Civil de Tuxtla",
  "etapa": "Demanda",
  "rolCliente": "actor",
  "cuantia": 250000,
  "abogado": "Christian",
  "sucursal": "Tuxtla",
  "resumen": "Demanda por pagarés",
  "termino": {
    "tipo": "prevencion",
    "descripcion": "Subsanar prevención",
    "fechaAcuerdo": "03/06/2026",
    "tipoNotificacion": "boletín",
    "esPrevencion": true,
    "diasParaContestar": 9,
    "inicioTermino": "05/06/2026",
    "vencimientoTermino": "16/06/2026"
  }
}
```
Requerido: `cliente`. El bloque `termino` es opcional. Devuelve el expediente creado (con su `numeroInterno`).

### `POST /api/n8n/terminos` — registrar prórroga/prevención sobre un expediente existente
```json
{ "numeroExpediente": "542/2026", "tipo": "prorroga", "descripcion": "Prórroga para pruebas",
  "diasParaContestar": 5, "inicioTermino": "10/06/2026", "vencimientoTermino": "17/06/2026" }
```

### `POST /api/n8n/asesorias` — registrar prospecto/asesoría
```json
{ "nombre": "Laura Méndez", "telefono": "9611112233", "tema": "Divorcio",
  "abogado": "Ana", "abogadoAgendo": "Karen", "sucursal": "Tuxtla",
  "pagoAsesoria": true, "monto": 500 }
```
Requerido: `nombre`.

`abogado` identifica a quien atendió; `abogadoAgendo` identifica a quien hizo la cita. Si
coinciden, se pueden mandar con el mismo nombre.

### `POST /api/n8n/pagos` — registrar o actualizar un cobro de Mercado Pago
```json
{
  "externalReference": "asesoria-300-abc123",
  "servicio": "llamada_asesoria",
  "concepto": "Asesoría por llamada",
  "montoBase": 300,
  "comision": 13.25,
  "estado": "pending",
  "linkPago": "https://link.mercadopago.com.mx/...",
  "mpPreferenceId": "123456789"
}
```

Requeridos: `externalReference`, `servicio` y `montoBase`. El backend calcula
`montoTotal = montoBase + comision`. El mismo endpoint recibe las actualizaciones del webhook
(`approved`, `rejected`, `cancelled` o `refunded`) sin duplicar el cobro. Si se manda `citaId`
y el pago queda `approved`, la cita cambia a `confirmada`.

### `POST /api/n8n/caja` — registrar movimiento / corte de caja
```json
{ "tipo": "ingreso", "concepto": "Corte de caja", "monto": 4500,
  "sucursal": "Tuxtla", "abogado": "Christian" }
```
Requerido: `tipo` (`ingreso`|`egreso`) y `monto`. Opcional: `numeroExpediente`.

### `POST /api/n8n/citas` — agendar cita (bot externo)
```json
{ "cliente": "María López", "telefono": "9615551212", "asunto": "Divorcio",
  "fechaHora": "2026-06-12T15:00:00", "abogado": "Ana", "sucursal": "Tuxtla" }
```
Requerido: `cliente` y `fechaHora`.

### `POST /api/n8n/seguimientos` — registrar caso de seguimiento (llamadas recurrentes)
```json
{ "cliente": "Laura Méndez", "telefono": "9611112233", "tipoCaso": "Divorcio",
  "abogado": "Ana", "sucursal": "Tuxtla", "frecuenciaDias": 7 }
```
Requerido: `cliente` y `frecuenciaDias`. Calcula solo el próximo llamado.

### `POST /api/n8n/seguimientos/{id}/llamada` — marcar que el abogado ya llamó
Avanza `ultimoContacto` a hoy y recalcula `proximoLlamado`. Sin body.

---

## Lectura (GET)

### `GET /api/n8n/expedientes?numero=542/2026` — consultar expediente
Devuelve el expediente con cliente, abogado, términos vigentes, últimas actuaciones y audiencias.

### `GET /api/n8n/usuarios?telefono=9612683551` — identificar abogado por WhatsApp
Devuelve `{ id, nombre, rol, sucursal }`. Lo usa el bot para saber quién le escribe.

### `GET /api/n8n/vencimientos?dias=3` — términos por vencer
Para el CRON de alertas. Devuelve términos no cumplidos que vencen dentro de N días, con su expediente.

### `GET /api/n8n/seguimientos/pendientes` — a quién llamar hoy
Para el CRON matutino. Devuelve los seguimientos activos cuyo próximo llamado es hoy o antes.

### `GET /api/n8n/pagos?externalReference=asesoria-300-abc123` — consultar cobro
Devuelve el desglose de importe base, comisión, total y estado de Mercado Pago.

---

## Ejemplo de llamada (nodo HTTP Request en n8n)
- **Method:** POST
- **URL:** `https://.../api/n8n/expedientes`
- **Headers:** `x-api-key: <N8N_API_KEY>`, `Content-Type: application/json`
- **Body:** JSON (ver arriba)

---

## Pendiente para producción
- Conectar `DATABASE_URL` al Postgres del VPS (ver `deploy/README.md`).
- Definir `N8N_API_KEY` en el `.env` de la app y en las credenciales de n8n.
- Migrar cada tool del bot (que hoy escribe a Sheets) para que llame a estos endpoints.
- Subida de documentos a Drive (service account) — endpoint pendiente, requiere credenciales.
