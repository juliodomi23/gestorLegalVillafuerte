# GestorLegal — Referencia de API para n8n

Base URL: `https://<tu-dominio>/api/n8n`  
Header requerido en **todas** las llamadas: `x-api-key: 37kYSHeZ5TeRH+4HABtmjOTdbOsXEuaO`

---

## 1. Usuarios — identificar al abogado por WhatsApp

### `GET /usuarios?telefono=9611234567`

> Lo primero que hace el bot al recibir un mensaje: saber quién es el abogado.

**Respuesta exitosa:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "nombre": "Christian",
    "rol": "admin",
    "sucursal": "Tuxtla"
  }
}
```
**Error 404:** el número no está registrado en Configuración.

---

## 2. Expedientes

### `POST /expedientes` — crear expediente

**Body (mínimo):**
```json
{ "cliente": "Juan Pérez" }
```

**Body completo:**
```json
{
  "cliente": "Juan Pérez",
  "telefonoCliente": "9611234567",
  "numeroJudicial": "542/2026",
  "materia": "Civil",
  "tipoJuicio": "Ordinario",
  "juzgado": "3er Juzgado Civil",
  "etapa": "Demanda",
  "cuantia": 150000,
  "abogado": "Christian",
  "sucursal": "Tuxtla",
  "resumen": "Cobro de pagaré",
  "fechaInicio": "2026-06-09",
  "termino": {
    "descripcion": "contestar demanda",
    "diasParaContestar": 9,
    "inicioTermino": "2026-06-10",
    "vencimientoTermino": "2026-06-19"
  }
}
```
- `abogado` acepta nombre o teléfono WhatsApp
- `fechaInicio` acepta `dd/MM/yyyy`, `yyyy-MM-dd` o ISO
- `termino` es opcional; si se manda, se crea junto al expediente

**Respuesta:** `201` con el expediente creado + número interno (`EXP-2026-0001`)

---

### `GET /expedientes?numero=EXP-2026-0001`

Busca por número interno **o** judicial. Devuelve expediente completo con cliente, abogado, términos vigentes, últimas 10 actuaciones y audiencias.

---

## 3. Términos (vencimientos)

### `POST /terminos` — registrar término standalone

**Body:**
```json
{
  "numeroExpediente": "EXP-2026-0001",
  "descripcion": "subsanar prevención",
  "diasParaContestar": 5,
  "inicioTermino": "2026-06-10",
  "vencimientoTermino": "2026-06-15",
  "tipo": "prevencion",
  "esPrevencion": true,
  "fechaAcuerdo": "2026-06-09",
  "tipoNotificacion": "boletín"
}
```
- `tipo`: `"termino"` | `"prorroga"` | `"prevencion"` (default: `"termino"`)
- Solo `numeroExpediente` es requerido

---

### `GET /vencimientos?dias=3`

Términos por vencer en los próximos N días (default 3). Para CRON de alertas.

**Respuesta:** array con término + expediente + cliente + abogado

---

## 4. Audiencias

### `POST /audiencias` — registrar audiencia

**Body:**
```json
{
  "numeroExpediente": "EXP-2026-0001",
  "fechaHora": "2026-06-15T10:00:00",
  "tipo": "Desahogo de pruebas",
  "lugar": "3er Juzgado Civil, Tuxtla"
}
```
- Se puede usar `expedienteId` (UUID) en lugar de `numeroExpediente`
- `fechaHora` requerido

---

### `GET /audiencias?fecha=2026-06-15`

Audiencias programadas para ese día. Para CRON de recordatorios (default: hoy).

---

## 5. Asesorías

### `POST /asesorias` — registrar asesoría

**Body:**
```json
{
  "nombre": "María López",
  "telefono": "9612345678",
  "edad": "35",
  "domicilio": "Tuxtla Centro",
  "tema": "Divorcio",
  "resumen": "Divorció hace 2 años, quiere pensión",
  "pagoAsesoria": true,
  "monto": 500,
  "abogado": "Christian",
  "sucursal": "Tuxtla",
  "origen": "whatsapp"
}
```

---

### `GET /asesorias` — consultar asesorías

Filtros opcionales vía query params:
- `?status=pendiente` — `pendiente` | `contrato_firmado` | `no_regreso` | `descartado`
- `?telefono=9612345678`
- `?fecha=2026-06-09`
- `?sucursal=Tuxtla`
- `?limite=20` (default 100)

---

### `PATCH /asesorias/:id` — actualizar status o URL del doc

**Body (cualquier combinación):**
```json
{
  "status": "contrato_firmado",
  "urlDocumento": "https://drive.google.com/...",
  "resumen": "Acordaron honorarios"
}
```

---

### `GET /asesorias/resumen?fecha=2026-06-09`

Resumen del día para el CRON nocturno. Devuelve total, contratos, % conversión, recaudado y desglose por sucursal.

---

## 6. Citas

### `POST /citas` — agendar cita

**Body:**
```json
{
  "cliente": "Juan Pérez",
  "telefono": "9611234567",
  "asunto": "Revisión de contrato",
  "fechaHora": "2026-06-15T11:00:00",
  "abogado": "Christian",
  "sucursal": "Tuxtla",
  "numeroExpediente": "EXP-2026-0001",
  "origen": "bot_externo"
}
```

---

### `GET /citas?fecha=2026-06-15`

Citas del día (default: hoy). Para CRON de recordatorios.

---

### `PATCH /citas/:id` — confirmar o cancelar

**Body:**
```json
{ "estado": "confirmada" }
```
- `estado`: `"confirmada"` | `"cancelada"`

---

## 7. Seguimientos (CRM de llamadas)

### `POST /seguimientos` — registrar seguimiento

**Body:**
```json
{
  "cliente": "Juan Pérez",
  "telefono": "9611234567",
  "tipoCaso": "Pagaré",
  "abogado": "Christian",
  "sucursal": "Tuxtla",
  "frecuenciaDias": 15
}
```
- `frecuenciaDias` requerido (cada cuántos días llamar: 7, 15, 30…)
- Crea con `proximoLlamado = hoy + frecuenciaDias`

---

### `GET /seguimientos/pendientes`

A quién hay que llamar hoy. Para el CRON matutino.

---

### `POST /seguimientos/:id/llamada`

El abogado confirma que llamó. Avanza automáticamente el `proximoLlamado` según la frecuencia.

---

## 8. Caja

### `POST /caja` — registrar movimiento

**Body:**
```json
{
  "tipo": "ingreso",
  "concepto": "Honorarios EXP-2026-0001",
  "monto": 5000,
  "sucursal": "Tuxtla",
  "numeroExpediente": "EXP-2026-0001",
  "abogado": "Christian",
  "fecha": "2026-06-09",
  "origen": "whatsapp"
}
```
- `tipo`: `"ingreso"` | `"egreso"` — requerido
- `monto` requerido

---

## Notas generales

- **Nombres vs IDs:** todos los endpoints aceptan nombres en texto (`"abogado": "Christian"`, `"sucursal": "Tuxtla"`). El backend los resuelve a UUIDs automáticamente con búsqueda insensible a mayúsculas.
- **Fechas:** todos los campos de fecha aceptan `dd/MM/yyyy`, `yyyy-MM-dd` o ISO 8601.
- **Errores:** respuesta siempre `{ "ok": false, "error": "mensaje" }` con HTTP 400/404/500.
- **2 herramientas fuera del API:** subir documento a Drive y enviar WhatsApp siguen usando sus nodos nativos de n8n.
