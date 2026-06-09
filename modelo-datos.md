# GestorLegal — Modelo de Datos

**Fecha:** 2026-06-05
**Estado:** Fase 0 — Diseño del modelo de datos
**Cliente piloto:** Villafuerte y Asociados (mismo dueño que Dentu)

---

## Concepto

Gestor de expedientes para bufetes jurídicos. Patrón "producto base + personalizable"
igual que el gestor clínico de Dentu: trae módulos listos para el flujo legal y se
configura por despacho.

**Diferencial vs mercado (MiDespacho, LegalSurf, Clio):** captura y gestión por
WhatsApp. El abogado dicta "registra expediente de Juan Pérez, mercantil, audiencia el 12"
y el bot lo guarda. Resuelve el problema #1 del sector: la baja adopción por captura tediosa.

---

## Decisiones de arquitectura

1. **Instancia por despacho (single-tenant)** — cada bufete tiene su propio deploy de la
   app + su propia base de datos Postgres en su VPS, igual que ya operan con n8n (instancia
   por cliente) y VPS por cliente. Ventajas:
   - **Aislamiento total de datos** — crítico en legal (secreto profesional). Los datos de
     un despacho nunca tocan los de otro.
   - **Modelo de datos simple** — sin `despacho_id` ni RLS multi-tenant. Todo en la BD es
     de ese despacho.
   - **Personalización profunda** sin riesgo de afectar a otros clientes.
   - *Trade-off:* las actualizaciones se despliegan a cada instancia. Manejable con pocos
     clientes y deploy automatizado (mismo repo). Se reconsidera si crece a 20+ despachos.
2. **n8n escribe a Postgres, no a Google Sheets** — las tools de WhatsApp que ya existen
   (registrar expediente, asesoría, corte de caja…) apuntan a estas tablas. Migración
   incremental, una tool a la vez, sin tumbar producción.
3. **Documentos siguen en Google Drive** — la tabla guarda solo el link + metadatos.
   La web app sube los PDFs a Drive vía **service account** (misma carpeta del expediente
   donde el bot ya guarda). El front (zona de carga drag&drop, solo PDF) ya está en
   `prototipo.html` → tab Documentos.

### Stack (alineado a DoctoresConnect / Dentu)

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes + Prisma |
| Base de datos | **PostgreSQL self-hosted** (Docker en el VPS) — una BD por despacho |
| Auth | Auth.js (NextAuth) |
| Automatización | n8n existente (instancia n8n-villafuerte) |
| Documentos | Google Drive (link en BD) |

---

## Tablas

Leyenda: 🟢 MVP (fase 1) · 🔵 Fase 2

> Nota: al ser instancia por despacho, **ninguna tabla lleva `despacho_id`**. La identidad
> del despacho es la instancia misma; su configuración vive en la tabla `configuracion`.

### Configuración e identidad

#### 🟢 `configuracion` (una sola fila)
| Campo | Tipo | Nota |
|-------|------|------|
| id | int PK | siempre 1 |
| nombre_despacho | text | "Villafuerte y Asociados" |
| logo_url | text | |
| preferencias | jsonb | branding, materias activas, ajustes |
| actualizado_en | timestamptz | |

#### 🟢 `sucursales`
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| nombre | text | |
| direccion | text | |
| telefono | text | |

#### 🟢 `usuarios` (abogados y staff)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | liga a la tabla de auth (Auth.js) |
| sucursal_id | uuid FK → sucursales | nullable |
| nombre | text | |
| email | text | |
| telefono_whatsapp | text | **clave: identifica quién dicta por el bot** |
| rol | text | admin / abogado / asistente |
| activo | bool | |

### Corazón: expedientes

#### 🟢 `clientes`
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| nombre | text | persona o empresa |
| tipo | text | fisica / moral |
| telefono | text | el que usa con el bot externo |
| email | text | |
| notas | text | |

#### 🟢 `expedientes` (tabla central)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| numero_interno | text | EXP-2026-0142 |
| numero_judicial | text | 542/2026 (del juzgado) |
| materia | text | civil / mercantil / penal / familiar / laboral / amparo / administrativo |
| tipo_juicio | text | ordinario mercantil, divorcio… |
| juzgado | text | autoridad / juzgado |
| etapa_procesal | text | demanda / contestación / pruebas / sentencia / ejecución |
| estado | text | activo / suspendido / concluido / archivado |
| cuantia | numeric | monto en disputa |
| cliente_id | uuid FK → clientes | |
| rol_cliente | text | actor / demandado / tercero |
| abogado_responsable_id | uuid FK → usuarios | |
| sucursal_id | uuid FK → sucursales | |
| resumen | text | estado actual del caso (columna "Resumen" del Lic.) |
| fecha_inicio | date | |
| creado_en | timestamptz | |

#### 🟢 `partes` (partes del juicio)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| expediente_id | uuid FK → expedientes | |
| nombre | text | |
| rol | text | actor / demandado / tercero / abogado contrario |
| contacto | text | nullable |

#### 🟢 `actuaciones` (timeline del expediente)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| expediente_id | uuid FK | |
| fecha | date | |
| tipo | text | acuerdo / promoción / notificación / audiencia / nota |
| descripcion | text | |
| registrado_por | uuid FK → usuarios | |
| creado_en | timestamptz | |

### Plazos y agenda

#### 🟢 `audiencias`
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| expediente_id | uuid FK | |
| fecha_hora | timestamptz | |
| lugar | text | |
| tipo | text | conciliatoria / pruebas / alegatos… |
| estado | text | programada / realizada / diferida |

#### 🟢 `terminos` (términos procesales — mapea las columnas reales del Lic.)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| expediente_id | uuid FK | |
| tipo | text | termino / prorroga / prevencion |
| descripcion | text | "contestar demanda", "subsanar prevención" |
| fecha_acuerdo | date | columna **Fecha del acuerdo** |
| tipo_notificacion | text | columna **Tipo de Notificación** (boletín/personal/estrados) |
| es_prevencion | bool | columna **Es Prevención** |
| dias_para_contestar | int | columna **Días Para Contestar** |
| inicio_termino | date | columna **Inicio Término** |
| vencimiento_termino | date | columna **Vencimiento Término** |
| cumplido | bool | |
| alertado | bool | el CRON de vencimientos ya existe |

#### 🟢 `citas`
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| cliente_id | uuid FK | nullable |
| expediente_id | uuid FK | nullable |
| abogado_id | uuid FK → usuarios | |
| fecha_hora | timestamptz | |
| estado | text | agendada / confirmada / cancelada / no_show |
| origen | text | bot_externo / manual |

#### 🟢 `asesorias` (embudo de ventas — clientes potenciales)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| cliente_id | uuid FK | nullable |
| expediente_id | uuid FK | nullable, si deriva en caso |
| sucursal_id | uuid FK | |
| fecha | date | |
| nombre, telefono, edad, domicilio | text | datos del prospecto |
| tema | text | asunto (divorcio, pagaré…) |
| resumen | text | |
| pago_asesoria | bool | ¿pagó la asesoría? |
| monto | numeric | |
| seguimiento | text | acción de seguimiento |
| status | text | pendiente / contrato_firmado / no_regreso / descartado |
| abogado_id | uuid FK | |
| url_documento | text | link al PDF de hoja de asesoría en Drive |

---

## Módulo de Asesorías (flujo completo)

> Esta sección documenta cómo funciona el módulo en producción en Villafuerte y Asociados.
> Es la referencia para construir el equivalente en la web app.

### ¿Qué es una asesoría?

Una asesoría es el primer contacto de un prospecto con el despacho: un posible cliente llega
(en persona o por WhatsApp), consulta con un abogado sobre su caso, y puede o no pagar una
cuota de asesoría (~$500 MXN). Es la entrada del embudo de ventas: si el prospecto cierra
contrato, la asesoría deriva en expediente.

**El ciclo completo dura ~24–48h:**
1. Se registra la asesoría al momento (bot o web)
2. ~1h después, el bot pregunta si el cliente cerró contrato
3. Si no cerró → pasa a "Prospectos Indecisos" para seguimiento posterior

### Flujo operacional actual (bot n8n)

```
Abogado dicta al bot
        │
        ▼
[TOOL] Registrar Asesoría
  • Campos: nombre, teléfono, edad, domicilio, asunto,
    pago (S/N), monto, observación, seguimiento, sucursal, abogado
  • Adjunta PDF de hoja de asesoría (opcional → sube a Drive)
  • Guarda en Google Sheets (pestaña por sucursal)
  • Notifica al Lic. Christian por WhatsApp
  • Status inicial: "pendiente"
        │
        ▼ (~1h — CRON automático)
[CRON] Cierre Asesorías — pregunta al abogado:
  "¿El cliente [nombre] cerró contrato? Sí / No / Monto"
        │
        ├── Sí → Actualiza status en "Control Asesorias Tuxtla"
        │         Guarda monto y notas
        │
        └── No → Además registra en "Prospectos Indecisos"
                  para seguimiento posterior
```

### Tools del bot (n8n Villafuerte)

| Tool | ID | Descripción |
|------|----|-------------|
| `Registrar Asesoria` | `rQ12uxptkSV4EaDc` | Registra asesoría nueva con datos del prospecto y PDF opcional |
| `Consultar Asesorias` | `rIzHBe0S6RP16mb3` | Consulta asesorías por sucursal y periodo (hoy/semana/mes/fecha) |
| `Registrar Confirmacion Asesorias` | `IZBH6xFGiAlx8aP2` | El abogado confirma que ya reportó todas sus asesorías del día |
| `Estado Confirmaciones Asesorias` | `rI8Mk4hCac3YQXAi` | Revisa qué abogados ya confirmaron y quiénes faltan |
| `Registrar Cierre Asesoria` | `V9vE3ez2kFDS6msN` | Registra si el prospecto cerró contrato (Sí/No), monto y notas |

| CRON | ID | Estado |
|------|----|--------|
| Cierre Asesorias Tuxtla - Pregunta 1h | `kKNf2ZcXMEmu8rNU` | Activo |
| Seguimiento Asesorias 24H | `T4q7uEzyC2cZgKTl` | Inactivo |
| Reporte Bono Mensual Asesorias - Tuxtla | `vby8KY92HDIbeD1I` | Activo |
| Auditoria Hojas Asesorias 4PM-530PM | `vIakNybRpbCpBxeZ` | Inactivo |

### Storage actual (Google Sheets — migrar a Postgres)

**Documento:** `Asesorias` (ID: `1HRKha2ukD3s2_f6Ze_feLQ6pRRCmJ5HdKa_QP4ZDFTY`)

| Pestaña | Contenido |
|---------|-----------|
| Asesorias Tuxtla | Registro de asesorías de sucursal Tuxtla |
| Asesorias Sancris | Registro de asesorías de San Cristóbal |
| Asesorias Tapachula | Registro de asesorías de Tapachula |
| Asesorias Villaflores | Registro de asesorías de Villaflores |
| Asesorias comitan | Registro de asesorías de Comitán |
| Confirmaciones | Registro de cuándo cada abogado confirmó sus asesorías del día |
| Control Asesorias Tuxtla | Control de cierre: Cerró (Sí/No), Monto, Preguntado |
| Prospectos Indecisos | Prospectos que no cerraron → seguimiento posterior |

**Columnas del registro de asesoría:**
`Fecha | Nombre | Telefono | Abogado | Edad | Domicilio | Asunto | Pagó Asesoria (S/N) | Monto | status | Observacion | Seguimiento | URL`

**Documentos:** PDFs de hojas de asesoría guardados en Google Drive (mismo subworkflow que expedientes).

### Qué hace falta en la web app

- **Vista "Asesorías del día"** — tabla con filtro por sucursal y fecha; muestra todos los campos
  incluyendo si pagó y el link al PDF
- **Vista "Embudo de conversión"** — cuántas asesorías → cuántas cerraron contrato, tasa de cierre
  por abogado y sucursal
- **Vista "Prospectos Indecisos"** — tabla de seguimiento con estado y próximo contacto
- **Chip de origen** ("WhatsApp" / "Presencial") siguiendo el patrón del sistema de diseño
- **Migración n8n:** las tools del bot deberán apuntar a Postgres en vez de Sheets una vez que
  la tabla `asesorias` esté viva en el schema

---

#### 🟢 `seguimientos` (CRM ligero — "Casos por Abogado", llamadas recurrentes)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| cliente_id, abogado_id, sucursal_id | uuid FK | |
| tipo_caso | text | divorcio / pagaré / laboral… |
| fecha_inicio | date | cuándo firmó contrato |
| ultimo_contacto | date | última llamada del abogado |
| proximo_llamado | date | cuándo volver a llamar |
| frecuencia_dias | int | cada cuántos días |
| notas | text | |
| estado | text | activo / suspendido / cerrado |

### Documentos y dinero

#### 🟢 `documentos`
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| expediente_id | uuid FK | |
| nombre | text | |
| tipo | text | demanda / contrato / identificación / acuerdo |
| link_drive | text | archivo vive en Drive |
| subido_por | uuid FK | |
| creado_en | timestamptz | |

#### 🟢 `movimientos_caja`
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| sucursal_id | uuid FK | |
| expediente_id | uuid FK | nullable (honorarios) |
| tipo | text | ingreso / egreso |
| concepto | text | honorarios / gasto / anticipo |
| monto | numeric | |
| fecha | date | |
| registrado_por | uuid FK | |

#### 🔵 `llamadas` (fase 2 — batch Chiapas)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid PK | |
| sucursal_id | uuid FK | |
| cliente_id | uuid FK | nullable |
| fecha | date | |
| resultado | text | contestó / no contestó / agendó |
| notas | text | |

### Catálogos (configurables por despacho)

Esto hace al producto **personalizable**: cada despacho define sus propias materias,
etapas y juzgados en vez de tener una lista fija.

- 🟢 `cat_materias` (id, nombre)
- 🟢 `cat_etapas` (id, nombre, orden)
- 🟢 `cat_juzgados` (id, nombre, direccion)

---

## Diagrama de relaciones

```
configuracion (1 fila: nombre, logo, preferencias del despacho)

sucursales
usuarios (abogados) ──────────┐
clientes ──┐                  │
catalogos (materias/etapas/juzgados)
expedientes ◄─────────────────┘ (abogado_responsable)
     │   ▲
     │   └── cliente
     ├─ partes
     ├─ actuaciones (timeline: promociones/acuerdos)
     ├─ audiencias
     ├─ terminos (acuerdo + notificación + vencimiento)
     ├─ documentos (→ link Drive)
     ├─ asesorias
     ├─ citas
     └─ movimientos_caja (honorarios)
```

---

## Pendientes de validar antes del SQL

1. ¿`etapa_procesal` y `materia` como texto libre con catálogo, o enum estricto?
   (recomendado: catálogo para que sea personalizable)
2. ¿Un expediente puede tener varios abogados o solo un responsable?
   (MVP: un responsable; fase 2: equipo)
2b. **Visibilidad por rol:** ¿un abogado ve solo SUS expedientes o TODOS los del despacho?
   (default propuesto: solo los suyos. Roles: admin ve todo + caja + config; abogado ve lo
   suyo sin finanzas; asistente apoya sin ver caja. Reflejado en wireframes.html.)
3. ¿Honorarios necesitan plan de pagos/parcialidades o basta el registro simple?
4. Confirmar con el Lic. qué campos del expediente son obligatorios en su flujo real.

---

## Próximos pasos

1. ✅ Validar campos con el flujo real del Lic. (sus encabezados → mapeados a `terminos`)
2. ✅ `schema.sql` (Postgres) generado — pendiente migraciones Prisma
3. ✅ Wireframes lo-fi (`wireframes.html`) con vistas por rol
4. Migrar la primera tool de n8n (registrar expediente) de Sheets → Postgres
5. Scaffold del proyecto Next.js + Prisma (introspección del schema)
6. Definir modelo de cobro (ver `propuesta-comercial.md` — pendiente)

---

**Retomar en:** próxima sesión con contexto de este archivo
