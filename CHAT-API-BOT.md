# API de bots del chat (compatible con Chatwoot)

Rama `chat-bot-api`. Permite que los workflows de n8n del despacho hablen con el chat de
GestorLegal **sin cambiar su lógica**: solo cambian la URL base, el token y el destino del
webhook. Se activa con `CHAT_WHATSAPP_ACTIVO=true`; apagado, nada de esto existe (404).

> Estado: construido y probado con un Postgres desechable y la Cloud API simulada.
> **No** probado: envío real a WhatsApp, plantillas aprobadas por Meta, descarga real de media.

## Quién ve qué

El chat lo abre cualquier usuario con sesión; **lo que ve lo decide su alcance** (se consulta
a la base en cada petición, así que quitar un permiso surte efecto de inmediato):

| Alcance | Quién | Qué ve | Puede reasignar |
|---|---|---|---|
| Todas | Administradores | Todas las conversaciones de todos los números | Sí |
| Recepción | Quien tenga el permiso **Chat: recepción** (Configuración › Usuarios) | **Todas** las conversaciones | Sí |
| Propias | El resto (abogados, asistentes) | Solo las asignadas a esa persona | No |

**Por atender** es una vista (pestaña y etiqueta), no un límite: sin responsable, abierta o
pendiente, y con la etiqueta `escalado_humano`, `bot_off` o `requiere_atencion` (o en estado
pendiente). Al asignarla a un abogado deja de estar por atender.
Una conversación que no es visible para la persona responde **404** (no revela que existe).
La regla vive en `src/lib/chat/alcance.ts` y `acceso.ts`.

El permiso de recepción es **independiente** de "Ver todas las asesorías": no da acceso a
asesorías de otras sucursales. Configuración del canal, tokens y webhooks siguen siendo solo de admin.

## Embudo

Sección **Embudo** (debajo de Chat): un tablero tipo kanban donde cada tarjeta es una conversación.
Respeta la misma visibilidad que el chat. Las etapas son configurables (solo admin: renombrar,
color, orden, agregar; las del sistema no se quitan). Por defecto:

| Etapa | Clave | Cuándo llega sola |
|---|---|---|
| Nuevo | `nuevo` | Al nacer la conversación (primer mensaje) |
| Contactado | `contactado` | El resultado de una llamada es "no contestó" o "llamar después" (prospectos, no asistieron, ya asesoraron) |
| Agendó cita | `agendo_cita` | Se registra una cita (`POST /api/n8n/citas`), `prospectos/agendo-cita`, o la llamada termina en "agendó cita" |
| Agendó llamada | `agendo_llamada` | El bot registra al prospecto (`POST /api/n8n/prospectos`) |
| Asesorado | `asesorado` | Se registra la asesoría (`POST /api/n8n/asesorias`) |
| Contrato firmado | `contrato_firmado` | La asesoría pasa a `contrato_firmado` o se sube el contrato |
| No asistió | `no_asistio` | La cita se marca `no_show` |
| Perdido | `perdido` | Prospecto o llamada "descartado", o asesoría `no_regreso` / `descartado` |

- **Solo avanza**: un evento tardío nunca regresa una tarjeta. Llamada y Contactado son pares
  (se puede pasar de uno a otro); la cita es lo que sigue. **Contrato firmado cierra** y nada lo mueve.
  **No asistió** y **Perdido** se pueden marcar desde casi cualquier punto y se reactivan con
  cualquier avance posterior (volvió a agendar, le contestaron). Una etapa propia del despacho
  no se mueve sola.
- **Ligado al chat:** la cita o asesoría queda ligada a la conversación por el `conversationId`
  que mande el bot o, si no lo manda, por el teléfono. Se ve en el panel de la conversación.
- **El bot también la mueve:** `POST /api/v1/accounts/1/conversations/:id/funnel` con
  `{ "etapa": "Agendó cita" }` (acepta nombre, clave o id; si no existe responde 422 con la lista
  válida) y `GET` para leerla. Para que los workflows manden el `conversationId` basta con
  agregarlo al body de `agendar_cita_*`, `registrar_prospecto` y `Registrar Asesoria`.
- Cada movimiento queda en `conversaciones_etapas_historial` (automático, bot o persona).

## Varios números de WhatsApp

Cada número conectado (Configuración › Conexión manual) es un **inbox** con ID numérico propio
(`canales_whatsapp.numero_compat`, desde 1) que la API recibe como `inbox_id`. Sin `inbox_id` se usa el
primer canal activo.

- Como en Chatwoot, un contacto es una **persona**: `contacts/search` devuelve uno por teléfono aunque
  esté en varios números; `contactable_inboxes` lista todos los números y `contacts/:id/conversations`
  devuelve sus conversaciones en cada uno (cada una con su `inbox_id`).
- Una conversación por persona y número. `POST conversations` con otro `inbox_id` la crea en ese número.
- El webhook saliente lleva `inbox` e `inbox_id` del número por el que entró el mensaje.
- Limitación: la firma del webhook de Meta se valida con un solo `META_APP_SECRET`. Los números del
  mismo negocio comparten app y secreto; números de **apps de Meta distintas** requerirían un secreto por canal.

## Autenticación

Header `api_access_token: <token>` en todo `/api/v1`. Los tokens se crean en
**Configuración → Integraciones del chat** (solo admin). El valor completo se muestra una
vez; en base solo queda su SHA-256. Revocar no borra: el token queda inactivo.

- `accountId` siempre es `1`; `inbox_id` siempre es `1`.
- Límite por token: `BOT_RATE_LIMIT_MAX` (300) por `BOT_RATE_LIMIT_WINDOW_MS` (60000).
- Tokens inválidos por IP: `BOT_AUTH_FAIL_MAX` (20) por `BOT_AUTH_FAIL_WINDOW_MS` (300000) y luego 429.
- IP del cliente: encabezado de `IP_HEADER` (por defecto `x-real-ip`, que escribe el proxy).
- Cada llamada queda en `auditoria_bot` (método, ruta sin query, status, acción). No se guardan cuerpos ni teléfonos.

## IDs

Contactos, conversaciones y mensajes se exponen con un **ID numérico** (`numero_compat`).
Los bodies de n8n interpolan `contact_id` e `inbox_id` sin comillas, así que un UUID rompería el JSON.
La secuencia empieza en **1,000,000** y acepta valores explícitos: deja rango para importar
después las conversaciones de Chatwoot conservando sus IDs (`Prospecto.conversationId` y los
eventos de Google Calendar guardan IDs de conversación de Chatwoot).

## Endpoints

| Método y ruta | Notas |
|---|---|
| `GET contacts/search?q=` | Teléfono (compara los últimos 10 dígitos) o nombre. `{ meta:{count}, payload:[…] }` |
| `POST contacts` | `{inbox_id, name, phone_number, custom_attributes?}` → `{ payload:{ contact, contact_inbox } }`. 422 si ya existe |
| `GET` / `PUT contacts/:id` | `{ payload }` |
| `GET contacts/:id/contactable_inboxes` | `{ payload:[{ source_id, inbox:{id} }] }` |
| `GET contacts/:id/conversations` | `{ payload:[{ id, inbox_id, labels, custom_attributes, … }] }` |
| `POST conversations` | `{source_id, inbox_id, contact_id}` → conversación (si ya existe, la devuelve) |
| `GET conversations/:id` | Conversación |
| `GET` / `POST conversations/:id/messages` | Texto, nota privada (`private:true`) o plantilla (`template_params`) |
| `GET` / `POST conversations/:id/labels` | `POST` **reemplaza** el conjunto (semántica Chatwoot). Etiquetas nuevas se crean |
| `POST conversations/:id/custom_attributes` | `{custom_attributes:{…}}`, se fusiona con los actuales |
| `POST conversations/:id/assignments` | `{assignee_id}` = UUID o correo de un usuario activo; `null` desasigna |
| `POST conversations/:id/toggle_status` | `open`, `pending`, `resolved`, `snoozed` |
| `GET attachments/:mensajeId` | Archivo entrante. **Requiere token**; `Cache-Control: private, no-store` |

Plantillas: `template_params: { name, category, language, processed_params: {"1":…,"2":…} }`.
Los parámetros se ordenan por número y se envían como cuerpo de la plantilla de Meta.
Fuera de la ventana de 24 h, un texto responde **422**; una plantilla sí sale.

## Webhook saliente (GestorLegal → n8n)

Se configuran en **Configuración → Integraciones del chat**. Mismo `message_created` que
n8n recibe hoy de Chatwoot, con: `account.id`, `conversation.id`,
`conversation.contact_inbox.{contact_id, source_id}`, `conversation.labels`,
`conversation.messages[0].sender_type`, `content_type`, `message_type`, `sender`,
`attachments[].{file_type, data_url}`.

Eventos: `message_created`, `message_updated`, `conversation_created`,
`conversation_status_changed`, `conversation_updated`, `contact_updated`.
(Hoy se emiten los de mensajes entrantes y los de conversación; `message_updated` y
`contact_updated` están reservados.)

- Cabeceras: `X-Chatwoot-Event`, `X-Chatwoot-Delivery` (id para deduplicar),
  `X-Chatwoot-Timestamp`, `X-Chatwoot-Signature: sha256=HMAC(secreto, "<timestamp>.<cuerpo>")`.
- Entrega **al menos una vez**, con bandeja de salida: el mensaje se guarda antes de avisar.
  Reintentos con espera creciente (30 s, 1 min, 2 min… tope 30 min), `WEBHOOK_MAX_INTENTOS` (6).
- Un n8n caído **no** pierde ni bloquea el mensaje entrante.
- Seguridad (SSRF): la URL debe ser `https` y su host estar en `WEBHOOK_HOSTS_PERMITIDOS`
  (lista separada por comas). Sin la variable, no se acepta ninguna. No sigue redirecciones.
- La etiqueta `bot_off` conserva su significado: el evento se envía **con** ella y el workflow
  decide no responder, igual que hoy.

## Archivos

El audio, las imágenes y los documentos entrantes se descargan de Meta y se guardan en
`uploads/chat/` (volumen `gestorlegal_uploads`, o `CHAT_MEDIA_DIR`), con nombre aleatorio,
lista blanca de tipos y tope de 16 MiB. Se sirven solo con sesión de admin o con token de API.
**El respaldo actual (`bajar-respaldo.sh`) es de la base de datos: este volumen hay que respaldarlo aparte.**

## Retención

`CHAT_RETENCION_ENTREGAS_DIAS` (14) para entregas ya cerradas y `CHAT_RETENCION_AUDITORIA_DIAS` (90).
Se limpia cada hora desde el proceso web.

## Orden de despliegue

1. Respaldar la base.
2. Desplegar la rama. El `prisma db push` del contenedor (sin cambios en el Dockerfile) crea las tablas **vacías**.
3. Correr, en orden, las migraciones (todas idempotentes): `add_chat_bot_api.sql` (los `CHECK`,
   etiquetas semilla, secuencias desde 1,000,000 y backfill de contactos), `add_chat_multinumero.sql`
   (IDs de inbox), `add_chat_permisos.sql` (permiso de recepción: al crearse la columna, quien ya
   tenía "Ver todas las asesorías" y no es admin la recibe encendida) y `add_chat_embudo.sql`
   (las 8 etapas, la etapa de cada conversación y el vínculo de citas y asesorías; si el despacho ya
   tenía una etapa propia con el mismo nombre de una del sistema, la adopta en vez de duplicarla).
   Después, en Configuración › Usuarios, marcar **Chat: recepción** a quien corresponda.
4. Variables: `CHAT_WHATSAPP_ACTIVO`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`,
   `META_TOKEN_ENCRYPTION_KEY`, `NEXTAUTH_URL` (se usa para los `data_url`), `WEBHOOK_HOSTS_PERMITIDOS`.
5. En la demo: conectar un número **de prueba** de Meta. Con el número real de un cliente,
   el webhook de la app de Meta es un corte: Chatwoot deja de recibir.

## Qué cambia en cada workflow de n8n (verificado en los workflows reales)

Todos usan la misma forma de llamada; solo cambia **la base y el token**.

| Workflow | Cambio |
|---|---|
| Asistente Principal | `serverUrl` de "Datos de Entrada" → URL de GestorLegal. Los nodos `Download Audio` / `Download Audio1` hoy reemplazan el host de Chatwoot en `data_url`: quitar ese `replace` (el `data_url` ya es el correcto) y mantener el header `api_access_token`. El webhook de n8n se registra como webhook saliente |
| Agente Personal - Lic Christian | `Descargar Audio` y `Descargar Imagen` hoy **no** llevan autenticación: agregar `api_access_token`. Su filtro revisa `bot_off` **y** `escalado_humano` |
| [CRON] No-Shows 8PM, [CRON] Seguimiento No Contestó | Nodo "Configuracion": `chatwoot_url`, `chatwoot_token`. `chatwoot_account` = 1 y `chatwoot_inbox` = 1 |
| Recordatorios | Las URLs están escritas con `https://chat.ambarrojo.cloud/api/v1/accounts/1/…` y la credencial "api access token chatwoot": cambiar host y valor de la credencial. `inbox_id` ya es 1 |
| Confirmacion de cita | Los nodos "Añadir etiqueta" y "Nota Interna Chatwoot" traen el token **escrito en el nodo**. Pasarlo a una credencial de n8n y rotarlo |
| Otros (≈70 activos) | **No revisados.** Buscar `chat.ambarrojo.cloud` y `/api/v1/accounts` antes de migrar |

## Límites conocidos (decisiones, no olvidos)

- Una conversación por contacto. Chatwoot permite varias; aquí `POST conversations` devuelve la existente.
- Un solo canal (`inbox_id` = 1). Equipos, automatizaciones, macros, CSAT y SLA de Chatwoot no existen.
- Plantillas: solo nombre, idioma y parámetros del cuerpo (sin botones ni cabeceras).
- Envío saliente de archivos: no implementado.
- El despachador de webhooks vive dentro del proceso web. Con varias instancias hay que moverlo a un cron.
- Orden de eventos concurrentes no garantizado; deduplicar con `X-Chatwoot-Delivery`.
- La visibilidad es por persona asignada, no por sucursal. Un abogado no puede devolver una
  conversación a recepción por sí mismo (solo la reasigna recepción o administración).
- El historial de Chatwoot se importa con `web/scripts/importar-chatwoot.mjs` (ver abajo). Los
  adjuntos no se descargan: entran como `[imagen — adjunto no importado]`.

## Importar el historial de Chatwoot

```
CW_TOKEN=<token de administrador> node scripts/importar-chatwoot.mjs --solo-lectura   # cuenta, no escribe
CW_TOKEN=... node scripts/importar-chatwoot.mjs --limite 50                           # prueba
CW_TOKEN=... node scripts/importar-chatwoot.mjs                                       # todo
```

- En Chatwoot solo lee. No dispara webhooks ni bots (escribe directo en la base).
- Se puede repetir: omite lo ya importado y solo agrega mensajes y conversaciones nuevas.
- Conserva los IDs de conversación, contacto y mensaje (por debajo de 1,000,000) y el `inbox_id`
  del canal. Varias conversaciones del mismo teléfono se unen en la más reciente.
- Crea el canal con el `phone_number_id` y el WABA de Chatwoot, **desconectado**: al conectar el
  número real en Configuración › WhatsApp el mismo canal se actualiza y no se duplican chats.
- Etapa inicial por etiqueta: `no_asistio` → No asistió, `cita_cancelada` → Contactado,
  `cita_confirmada`/`cita_agendada` → Agendó cita, `llamada_agendada` → Agendó llamada, el resto Nuevo.
- `pending` y `open` entran como abiertas (no inundan "Por atender"); `resolved` como cerradas.
- Vínculo con cliente/prospecto: por teléfono único o por `Prospecto.conversationId`.
