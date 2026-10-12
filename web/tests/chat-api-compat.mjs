// Compatibilidad con los workflows reales de n8n de Villafuerte.
// Cada bloque reproduce, con las MISMAS expresiones de los nodos "Code" de n8n, lo que
// hacen: [CRON] No-Shows 8PM, [CRON] Seguimiento No Contestó, Recordatorios,
// Confirmacion de cita y los bots (Asistente Principal / Agente Personal).
import assert from "node:assert/strict";
import http from "node:http";
import { createHmac, randomInt } from "node:crypto";

const baseUrl = process.env.CHAT_TEST_BASE_URL || "http://127.0.0.1:3310";
const email = process.env.CHAT_TEST_ADMIN_EMAIL || "admin@chat-demo.test";
const password = process.env.CHAT_TEST_ADMIN_PASSWORD || "DemoChat123!";
const appSecret = process.env.META_APP_SECRET || "demo-app-secret";
const puertoReceptor = Number(process.env.CHAT_TEST_RECEPTOR_PUERTO || 3399);
const puertoCaido = Number(process.env.CHAT_TEST_PUERTO_CAIDO || 3398);
const phoneNumberId = "100000000000001";
const api = `${baseUrl}/api/v1/accounts/1`;

// ------------------------------------------------------------------ utilidades
function cookiesDe(headers) {
  const valores = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
  return valores.map((valor) => valor.split(";", 1)[0]).join("; ");
}

async function iniciarSesion(correo, clave) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrf = await csrfResponse.json();
  let cookie = cookiesDe(csrfResponse.headers);
  const login = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: correo, password: clave, callbackUrl: `${baseUrl}/chat`, json: "true" }),
    redirect: "manual",
  });
  cookie = [cookie, cookiesDe(login.headers)].filter(Boolean).join("; ");
  assert.ok(cookie.includes("next-auth.session-token"), "NextAuth no devolvió cookie de sesión");
  return cookie;
}

const cookie = await iniciarSesion(email, password);
const cookieAbogada = await iniciarSesion("abogada@chat-demo.test", password);

async function admin(ruta, metodo = "GET", cuerpo, cookieUsada = cookie) {
  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: { Cookie: cookieUsada, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: respuesta.status, json: await respuesta.json().catch(() => ({})) };
}

let token = "";
async function v1(ruta, { metodo = "GET", cuerpo, tokenUsado = token } = {}) {
  const respuesta = await fetch(`${api}${ruta}`, {
    method: metodo,
    headers: { ...(tokenUsado ? { api_access_token: tokenUsado } : {}), ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: respuesta.status, json: await respuesta.json().catch(() => ({})), headers: respuesta.headers };
}

// ------------------------------------------------------------------ receptor de webhooks
const recibidos = [];
const receptor = http.createServer((req, res) => {
  const partes = [];
  req.on("data", (parte) => partes.push(parte));
  req.on("end", () => {
    const crudo = Buffer.concat(partes).toString("utf8");
    let json = null;
    try { json = JSON.parse(crudo); } catch {}
    recibidos.push({ headers: req.headers, crudo, json });
    res.writeHead(200).end("ok");
  });
});
await new Promise((resolve) => receptor.listen(puertoReceptor, "127.0.0.1", resolve));

async function esperarEvento(predicado, descripcion, ms = 12000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    const encontrado = recibidos.find(predicado);
    if (encontrado) return encontrado;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.fail(`No llegó al webhook: ${descripcion}`);
}

// ------------------------------------------------------------------ entrantes de Meta (firmados)
async function entranteMeta({ from, id, nombre = "Cliente Compat", tipo = "text", cuerpo = "Hola", adjunto }) {
  const message = { id, from, type: tipo, timestamp: String(Math.floor(Date.now() / 1000)) };
  if (tipo === "text") message.text = { body: cuerpo };
  else message[tipo] = adjunto;
  const payload = JSON.stringify({
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneNumberId }, contacts: [{ wa_id: from, profile: { name: nombre } }], messages: [message] } }] }],
  });
  const firma = `sha256=${createHmac("sha256", appSecret).update(payload).digest("hex")}`;
  const respuesta = await fetch(`${baseUrl}/api/meta/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-signature-256": firma },
    body: payload,
  });
  assert.equal(respuesta.status, 200);
}

const corrida = String(randomInt(100000, 999999));
const tel10 = `9620${corrida}`;
const e164 = `+521${tel10}`;
const wamid = (nombre) => `wamid.compat.${corrida}.${nombre}`;

const idsWebhooks = [];
let idToken = "";
try {
  // limpieza de corridas anteriores que hayan quedado a medias
  const previos = await admin("/api/chat/webhooks");
  for (const w of previos.json.webhooks || []) if (w.nombre.startsWith("compat-")) await admin(`/api/chat/webhooks/${w.id}`, "DELETE");

  // ================================================================== 0. acceso y seguridad
  assert.equal((await v1("/contacts/search?q=1", { tokenUsado: "" })).status, 401, "sin token debe ser 401");
  assert.equal((await v1("/contacts/search?q=1", { tokenUsado: "token-falso" })).status, 401, "token falso debe ser 401");
  assert.equal((await fetch(`${baseUrl}/api/chat/tokens`, { redirect: "manual" })).status === 200, false, "tokens expuestos sin sesión");
  assert.equal((await admin("/api/chat/tokens", "GET", undefined, cookieAbogada)).status, 403, "un abogado no administra tokens");

  const creado = await admin("/api/chat/tokens", "POST", { nombre: `compat-${corrida}` });
  assert.equal(creado.status, 201);
  token = creado.json.valor;
  idToken = creado.json.token.id;
  assert.ok(token && token.length >= 30);
  const lista = JSON.stringify((await admin("/api/chat/tokens")).json);
  assert.ok(!lista.includes(token), "la lista de tokens revela el token completo");
  assert.equal((await fetch(`${baseUrl}/api/v1/accounts/2/contacts/search?q=1`, { headers: { api_access_token: token } })).status, 404, "otra cuenta debe ser 404");

  // ================================================================== 1. webhook saliente
  const hook = await admin("/api/chat/webhooks", "POST", { nombre: `compat-${corrida}`, url: `http://127.0.0.1:${puertoReceptor}/hook` });
  assert.equal(hook.status, 201, `crear webhook: ${JSON.stringify(hook.json)}`);
  idsWebhooks.push(hook.json.webhook.id);
  const secretoHook = hook.json.secreto;
  assert.ok(!JSON.stringify((await admin("/api/chat/webhooks")).json).includes(secretoHook), "la lista revela el secreto");
  const rechazado = await admin("/api/chat/webhooks", "POST", { nombre: "x", url: "https://evil.example/hook" });
  assert.equal(rechazado.status, 400, "un host fuera de la lista debe rechazarse");

  // ================================================================== 2. [CRON] No-Shows 8PM
  // Buscar Contacto -> Contacto Existe
  let r = await v1(`/contacts/search?q=${encodeURIComponent(e164)}`);
  assert.equal(r.status, 200);
  let contacto = (r.json.payload || []).find((p) => (p.phone_number || "") === e164);
  assert.equal(contacto, undefined, "el contacto no debe existir todavía");
  assert.equal(r.json.meta.count, 0);

  // Crear Contacto -> Normalizar Contacto Creado
  r = await v1("/contacts", { metodo: "POST", cuerpo: { inbox_id: 1, name: "Cliente Compat", phone_number: e164 } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  contacto = r.json.payload ? r.json.payload.contact : r.json;
  const contactoId = contacto ? contacto.id : null;
  assert.equal(typeof contactoId, "number", "contact_id debe ser numérico: n8n lo interpola sin comillas");
  assert.ok(contactoId >= 1000000);
  assert.equal(contacto.phone_number, e164);
  r = await v1("/contacts", { metodo: "POST", cuerpo: { inbox_id: 1, name: "Repetido", phone_number: e164 } });
  assert.equal(r.status, 422, "crear un contacto repetido debe fallar como Chatwoot");

  // Contactable Inboxes -> Extraer Source Id
  r = await v1(`/contacts/${contactoId}/contactable_inboxes`);
  assert.equal(r.status, 200);
  const enInbox = (r.json.payload || []).find((x) => String(x.inbox && x.inbox.id) === String(1));
  const sourceId = enInbox ? enInbox.source_id : null;
  assert.equal(sourceId, `521${tel10}`);

  // Buscar Conversaciones Cliente -> Conversacion Existe
  r = await v1(`/contacts/${contactoId}/conversations`);
  assert.equal(r.status, 200);
  let lista1 = Array.isArray(r.json.payload) ? r.json.payload : Array.isArray(r.json) ? r.json : [];
  let conv = lista1.find((c) => String(c.inbox_id) === "1");
  assert.equal(conv, undefined);

  // Crear Conversacion -> Extraer Conversacion Id
  r = await v1("/conversations", { metodo: "POST", cuerpo: { source_id: sourceId, inbox_id: 1, contact_id: contactoId } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const conversacionId = r.json.id || null;
  assert.equal(typeof conversacionId, "number");
  const otraVez = await v1("/conversations", { metodo: "POST", cuerpo: { source_id: sourceId, inbox_id: 1, contact_id: contactoId } });
  assert.equal(otraVez.json.id, conversacionId, "crear dos veces no debe duplicar la conversación");
  await esperarEvento((e) => e.json?.event === "conversation_created" && e.json?.id === conversacionId, "conversation_created");

  // Enviar Mensaje Plantilla (template_params + processed_params)
  r = await v1(`/conversations/${conversacionId}/messages`, {
    metodo: "POST",
    cuerpo: {
      content: "Hola Ana, no pudimos atenderte.",
      message_type: "outgoing",
      template_params: { name: "no_asistio", category: "MARKETING", language: "es_MX", processed_params: { 1: "Ana" } },
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.private, false);
  assert.equal(typeof r.json.id, "number");

  // Marcar Oferta en Conversacion
  const atributosConv = {};
  r = await v1(`/conversations/${conversacionId}/custom_attributes`, {
    metodo: "POST",
    cuerpo: { custom_attributes: { ...atributosConv, oferta_noshow: "2026-10-12" } },
  });
  assert.equal(r.status, 200);

  // Leer Etiquetas Actuales -> Agregar Etiqueta no_asistio
  r = await v1(`/conversations/${conversacionId}/labels`);
  assert.deepEqual(r.json.payload, []);
  r = await v1(`/conversations/${conversacionId}/labels`, {
    metodo: "POST",
    cuerpo: { labels: [...new Set([...(r.json.payload || []), "no_asistio"])] },
  });
  assert.deepEqual(r.json.payload, ["no_asistio"]);

  // ================================================================== 3. segunda pasada (idempotencia)
  r = await v1(`/contacts/search?q=${encodeURIComponent(e164)}`);
  assert.equal((r.json.payload || []).find((p) => (p.phone_number || "") === e164)?.id, contactoId);
  r = await v1(`/contacts/${contactoId}/conversations`);
  conv = r.json.payload.find((c) => String(c.inbox_id) === "1");
  assert.equal(conv.id, conversacionId);
  assert.equal(conv.custom_attributes.oferta_noshow, "2026-10-12", "n8n lee atributosConv de esta lista");
  assert.deepEqual(conv.labels, ["no_asistio"]);

  // ================================================================== 4. Recordatorios
  r = await v1(`/contacts/search?q=${encodeURIComponent(e164)}`);
  const count = r.json.meta?.count || 0;
  assert.ok(count > 0);
  const idRecordatorio = r.json.payload[0].id;
  r = await v1(`/contacts/${idRecordatorio}/conversations`);
  const convActiva = r.json.payload.find((c) => {
    const labels = Array.isArray(c.labels) ? c.labels : [];
    return !labels.includes("bot_off") && !labels.includes("escalado_humano");
  });
  assert.ok(convActiva, "debe haber una conversación sin bot_off/escalado_humano");
  const labelsMerged = [...new Set([...(convActiva.labels || []), "recordatorio_enviado"])];
  r = await v1(`/conversations/${convActiva.id}/labels`, { metodo: "POST", cuerpo: { labels: labelsMerged } });
  assert.deepEqual(r.json.payload, ["no_asistio", "recordatorio_enviado"]);
  r = await v1(`/conversations/${convActiva.id}/messages`, {
    metodo: "POST",
    cuerpo: {
      message_type: "outgoing",
      content: "Hola Ana te confirmamos tu espacio…",
      template_params: { name: "recordatorio_cita_nuevo", category: "MARKETING", language: "es_MX", processed_params: { 1: "Ana", 2: "lunes 14", 3: "10:00", 4: "Tuxtla" } },
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.json));

  // ================================================================== 5. Confirmacion de cita
  r = await v1(`/conversations/${conversacionId}/labels`, { metodo: "POST", cuerpo: { labels: ["cita_confirmada"] } });
  assert.deepEqual(r.json.payload, ["cita_confirmada"], "POST labels reemplaza el conjunto, como Chatwoot");
  r = await v1(`/conversations/${conversacionId}/messages`, {
    metodo: "POST",
    cuerpo: { content: "🔒 SISTEMA: el cliente confirmó su cita.", private: true, message_type: "outgoing", sender: { type: "bot" } },
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.private, true);
  r = await v1(`/conversations/${conversacionId}/messages`);
  assert.ok(r.json.payload.some((m) => m.private === true), "la nota privada debe quedar en el hilo");
  r = await v1("/conversations/1/labels", { metodo: "POST", cuerpo: { labels: ["x"] } });
  assert.equal(r.status, 404, "una conversación inexistente debe ser 404");
  r = await v1(`/conversations/${conversacionId}/labels`, { metodo: "POST", cuerpo: { labels: ["etiqueta_nueva_compat"] } });
  assert.equal(r.status, 200, "una etiqueta desconocida se crea, no se rechaza");
  assert.ok(((await admin("/api/chat/etiquetas")).json.etiquetas || []).some((e) => e.nombre === "etiqueta_nueva_compat"));
  await v1(`/conversations/${conversacionId}/labels`, { metodo: "POST", cuerpo: { labels: ["cita_confirmada"] } });

  // ================================================================== 6. bots: payload entrante
  await entranteMeta({ from: `521${tel10}`, id: wamid("texto1"), cuerpo: "Sí confirmo, gracias" });
  const evento = await esperarEvento((e) => e.json?.event === "message_created" && e.json?.content === "Sí confirmo, gracias", "message_created entrante");
  const body = evento.json;

  // Firma del webhook saliente
  const firmaEsperada = `sha256=${createHmac("sha256", secretoHook).update(`${evento.headers["x-chatwoot-timestamp"]}.${evento.crudo}`).digest("hex")}`;
  assert.equal(evento.headers["x-chatwoot-signature"], firmaEsperada, "firma HMAC del webhook saliente");
  assert.ok(evento.headers["x-chatwoot-delivery"]);

  // Expresiones de "Datos de Entrada" (Asistente Principal)
  assert.equal(body.account.id, 1);
  assert.equal(body.conversation.id, conversacionId);
  assert.equal(body.conversation.contact_inbox.contact_id, contactoId);
  assert.equal(body.conversation.contact_inbox.source_id, `521${tel10}`);
  assert.equal(typeof body.id, "number");
  assert.equal(body.sender.name, "Cliente Compat");
  assert.equal(body.message_type, "incoming");
  assert.equal(body.content_type, "text");
  assert.equal(body.private, false);
  const tipoMensaje = body.attachments?.[0]?.file_type || body.content_type || "text";
  assert.equal(tipoMensaje, "text");
  // Filtrar Mensajes
  assert.equal(body.conversation.messages[0].sender_type, "Contact");
  assert.equal(body.conversation.labels.includes("bot_off") ? true : false, false);
  // Agente Personal: sender.phone_number
  assert.equal(body.sender.phone_number, e164);

  // bot_off: el flujo se apaga con la etiqueta
  await v1(`/conversations/${conversacionId}/labels`, { metodo: "POST", cuerpo: { labels: ["cita_confirmada", "bot_off"] } });
  await entranteMeta({ from: `521${tel10}`, id: wamid("texto2"), cuerpo: "¿Sigue en pie?" });
  const conBotOff = await esperarEvento((e) => e.json?.event === "message_created" && e.json?.content === "¿Sigue en pie?", "entrante con bot_off");
  assert.equal(conBotOff.json.conversation.labels.includes("bot_off"), true);
  await v1(`/conversations/${conversacionId}/labels`, { metodo: "POST", cuerpo: { labels: ["cita_confirmada"] } });

  // ================================================================== 7. asignación y estado
  const usuarios = (await admin("/api/chat/usuarios")).json.usuarios;
  assert.ok(usuarios.length > 0);
  r = await v1(`/conversations/${conversacionId}/assignments`, { metodo: "POST", cuerpo: { assignee_id: usuarios[0].id } });
  assert.equal(r.status, 200);
  r = await v1(`/conversations/${conversacionId}`);
  assert.equal(r.json.assignee_id, usuarios[0].id);
  r = await v1(`/conversations/${conversacionId}/assignments`, { metodo: "POST", cuerpo: { assignee_id: "00000000-0000-4000-8000-000000000000" } });
  assert.equal(r.status, 422);

  recibidos.length = 0;
  r = await v1(`/conversations/${conversacionId}/toggle_status`, { metodo: "POST", cuerpo: { status: "resolved" } });
  assert.equal(r.status, 200);
  assert.equal(r.json.payload.current_status, "resolved");
  await esperarEvento((e) => e.json?.event === "conversation_status_changed" && e.json?.status === "resolved", "conversation_status_changed");
  assert.equal((await v1(`/conversations/${conversacionId}`)).json.status, "resolved");
  r = await v1(`/conversations/${conversacionId}/toggle_status`, { metodo: "POST", cuerpo: { status: "raro" } });
  assert.equal(r.status, 422);
  await entranteMeta({ from: `521${tel10}`, id: wamid("reabre"), cuerpo: "Otra duda" });
  await esperarEvento((e) => e.json?.event === "message_created" && e.json?.content === "Otra duda", "entrante tras resolver");
  assert.equal((await v1(`/conversations/${conversacionId}`)).json.status, "open", "un entrante reabre la conversación");

  // ================================================================== 8. número nuevo y extranjero
  const telExtranjero = `1415${randomInt(1000000, 9999999)}`;
  await entranteMeta({ from: telExtranjero, id: wamid("extranjero"), nombre: "Cliente Extranjero", cuerpo: "Hello" });
  const creada = await esperarEvento((e) => e.json?.event === "conversation_created" && e.json?.contact_inbox?.source_id === telExtranjero, "conversation_created de número nuevo");
  assert.equal(creada.json.status, "open");
  await esperarEvento((e) => e.json?.event === "message_created" && e.json?.conversation?.contact_inbox?.source_id === telExtranjero, "message_created del número extranjero");
  r = await v1(`/contacts/search?q=${encodeURIComponent(`+${telExtranjero}`)}`);
  assert.equal(r.json.payload[0]?.phone_number, `+${telExtranjero}`, "un número extranjero conserva todos sus dígitos");

  // ================================================================== 9. audio (Whisper) autenticado
  await entranteMeta({ from: `521${tel10}`, id: wamid("audio"), tipo: "audio", adjunto: { id: "mock-audio-1", mime_type: "audio/ogg; codecs=opus" } });
  const conAudio = await esperarEvento((e) => e.json?.event === "message_created" && e.json?.attachments?.length > 0, "entrante con audio");
  const adjunto = conAudio.json.attachments[0];
  assert.equal(adjunto.file_type, "audio");
  assert.match(adjunto.data_url, /\/api\/v1\/accounts\/1\/attachments\/\d+$/);
  const sinToken = await fetch(adjunto.data_url);
  assert.equal(sinToken.status, 401, "el archivo no se sirve sin token");
  const conToken = await fetch(adjunto.data_url, { headers: { api_access_token: token } });
  assert.equal(conToken.status, 200);
  assert.match(conToken.headers.get("content-type"), /audio\/ogg/);
  assert.equal(conToken.headers.get("x-content-type-options"), "nosniff");
  assert.equal(conToken.headers.get("cache-control"), "private, no-store");

  // ================================================================== 10. n8n caído: el mensaje no se pierde
  const caido = await admin("/api/chat/webhooks", "POST", { nombre: `compat-caido-${corrida}`, url: `http://127.0.0.1:${puertoCaido}/hook` });
  assert.equal(caido.status, 201);
  idsWebhooks.push(caido.json.webhook.id);
  await entranteMeta({ from: `521${tel10}`, id: wamid("caido"), cuerpo: "Mensaje con n8n caído" });
  await esperarEvento((e) => e.json?.event === "message_created" && e.json?.content === "Mensaje con n8n caído", "entrante con un receptor caído (el sano sí recibe)");
  const internas = (await admin("/api/conversaciones")).json.conversaciones;
  const interna = internas.find((c) => c.numero === conversacionId);
  const hilo = (await admin(`/api/conversaciones/${interna.id}/mensajes`)).json.mensajes;
  assert.ok(hilo.some((m) => m.contenido === "Mensaje con n8n caído"), "el mensaje debe quedar guardado y visible");
  assert.ok(hilo.some((m) => m.privado === true), "la UI recibe las notas privadas marcadas");
  assert.ok(hilo.some((m) => m.tieneMedia === true && m.tipo === "audio"), "la UI recibe el audio descargado");
  assert.doesNotMatch(JSON.stringify(hilo), /mediaRuta|uploads/, "la UI no debe ver rutas del servidor");

  // ================================================================== 11. UI admin
  const detalle = (await admin(`/api/conversaciones/${interna.id}`)).json.conversacion;
  assert.equal(detalle.numero, conversacionId);
  assert.equal(detalle.atributos.oferta_noshow, "2026-10-12");
  const patch = await admin(`/api/conversaciones/${interna.id}`, "PATCH", { etiquetas: ["cita_confirmada", "desde_ui"], atributos: { nota_ui: "ok" }, estado: "pendiente" });
  assert.equal(patch.status, 200);
  const trasPatch = await v1(`/conversations/${conversacionId}`);
  assert.deepEqual(trasPatch.json.labels, ["cita_confirmada", "desde_ui"]);
  assert.equal(trasPatch.json.custom_attributes.nota_ui, "ok");
  assert.equal(trasPatch.json.status, "pending");
  const sinPermiso = await admin(`/api/conversaciones/${interna.id}`, "PATCH", { estado: "resuelta" }, cookieAbogada);
  assert.equal(sinPermiso.status, 403);

  // ================================================================== 12. revocar token
  const revocado = await admin(`/api/chat/tokens/${idToken}`, "DELETE");
  assert.equal(revocado.status, 200);
  assert.equal((await v1("/contacts/search?q=1")).status, 401, "un token revocado debe dejar de funcionar");
  idToken = "";

  console.log("ok: API compatible con Chatwoot (cadenas reales de n8n), webhooks firmados, bot_off, audio, extranjeros, n8n caído");
} finally {
  for (const id of idsWebhooks) await admin(`/api/chat/webhooks/${id}`, "DELETE").catch(() => {});
  if (idToken) await admin(`/api/chat/tokens/${idToken}`, "DELETE").catch(() => {});
  receptor.close();
}
