// Embudo del chat: etapas configurables, el bot mueve tarjetas y los eventos del despacho
// (cita, llamada, asesoría, firma) las avanzan y quedan ligados a la conversación.
import assert from "node:assert/strict";
import http from "node:http";
import { createHmac, randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const baseUrl = process.env.CHAT_TEST_BASE_URL || "http://127.0.0.1:3310";
const password = process.env.CHAT_TEST_ADMIN_PASSWORD || "DemoChat123!";
const appSecret = process.env.META_APP_SECRET || "demo-app-secret";
const n8nKey = process.env.N8N_API_KEY || "test-n8n-key";
const puertoReceptor = Number(process.env.CHAT_TEST_RECEPTOR_PUERTO_3 || 3396);
const api = `${baseUrl}/api/v1/accounts/1`;
const phoneNumberId = "100000000000001";

const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);
async function usuario(email, nombre, datos) {
  const base = { nombre, email, passwordHash: hash, debeCambiarPassword: false, activo: true, ...datos };
  return prisma.usuario.upsert({ where: { email }, update: base, create: base });
}
await usuario("recepcion@chat-demo.test", "Recepción Demo", { rol: "asistente", verChatRecepcion: true });
const abogada = await usuario("abogada@chat-demo.test", "Abogada Demo", { rol: "abogado", verChatRecepcion: false });

function cookiesDe(headers) {
  const valores = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
  return valores.map((valor) => valor.split(";", 1)[0]).join("; ");
}
async function iniciarSesion(correo) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrf = await csrfResponse.json();
  let cookie = cookiesDe(csrfResponse.headers);
  const login = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: correo, password, callbackUrl: `${baseUrl}/embudo`, json: "true" }),
    redirect: "manual",
  });
  cookie = [cookie, cookiesDe(login.headers)].filter(Boolean).join("; ");
  assert.ok(cookie.includes("next-auth.session-token"), `no hubo sesión para ${correo}`);
  return cookie;
}
const cookies = {
  admin: await iniciarSesion("admin@chat-demo.test"),
  recepcion: await iniciarSesion("recepcion@chat-demo.test"),
  abogada: await iniciarSesion("abogada@chat-demo.test"),
};

async function ui(quien, ruta, metodo = "GET", cuerpo) {
  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: { Cookie: cookies[quien], ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    redirect: "manual",
  });
  return { status: respuesta.status, json: await respuesta.json().catch(() => ({})) };
}
let token = "";
async function v1(ruta, { metodo = "GET", cuerpo } = {}) {
  const respuesta = await fetch(`${api}${ruta}`, {
    method: metodo,
    headers: { api_access_token: token, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: respuesta.status, json: await respuesta.json().catch(() => ({})) };
}
async function n8n(ruta, metodo, cuerpo) {
  const respuesta = await fetch(`${baseUrl}/api/n8n${ruta}`, {
    method: metodo,
    headers: { "x-api-key": n8nKey, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return { status: respuesta.status, json: await respuesta.json().catch(() => ({})) };
}

const recibidos = [];
const receptor = http.createServer((req, res) => {
  const partes = [];
  req.on("data", (p) => partes.push(p));
  req.on("end", () => {
    try { recibidos.push(JSON.parse(Buffer.concat(partes).toString("utf8"))); } catch {}
    res.writeHead(200).end("ok");
  });
});
await new Promise((resolve) => receptor.listen(puertoReceptor, "127.0.0.1", resolve));
async function esperar(predicado, descripcion, ms = 12000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    const e = recibidos.find(predicado);
    if (e) return e;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.fail(`No llegó: ${descripcion}`);
}

async function entrante(tel10, id, nombre) {
  const from = `521${tel10}`;
  const message = { id, from, type: "text", timestamp: String(Math.floor(Date.now() / 1000)), text: { body: "Hola, necesito asesoría" } };
  const payload = JSON.stringify({
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneNumberId }, contacts: [{ wa_id: from, profile: { name: nombre } }], messages: [message] } }] }],
  });
  const firma = `sha256=${createHmac("sha256", appSecret).update(payload).digest("hex")}`;
  const r = await fetch(`${baseUrl}/api/meta/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-hub-signature-256": firma }, body: payload });
  assert.equal(r.status, 200);
}

const corrida = String(randomInt(100000, 999999));
const telA = `9640${corrida}`;
const telB = `9641${corrida}`;
let idToken = "";
let idWebhook = "";
let etapaPropia = null;

async function tablero(quien = "admin") {
  return (await ui(quien, "/api/embudo")).json;
}
async function tarjetaPorTel(tel10, quien = "admin") {
  const t = await tablero(quien);
  const tarjeta = (t.tarjetas || []).find((c) => String(c.telefono).includes(tel10));
  return { tarjeta, etapas: t.etapas };
}
async function claveActual(tel10) {
  const { tarjeta, etapas } = await tarjetaPorTel(tel10);
  return etapas.find((e) => e.id === tarjeta?.etapaId)?.clave ?? `propia:${etapas.find((e) => e.id === tarjeta?.etapaId)?.nombre}`;
}

try {
  const t = await ui("admin", "/api/chat/tokens", "POST", { nombre: `embudo-${corrida}` });
  token = t.json.valor;
  idToken = t.json.token.id;
  const hook = await ui("admin", "/api/chat/webhooks", "POST", { nombre: `compat-embudo-${corrida}`, url: `http://127.0.0.1:${puertoReceptor}/hook` });
  idWebhook = hook.json.webhook.id;

  // ================================================================== 1. etapas por defecto y configuración
  const etapas = (await ui("abogada", "/api/embudo/etapas")).json.etapas;
  const claves = etapas.filter((e) => e.clave).map((e) => e.clave);
  assert.deepEqual(
    ["nuevo", "contactado", "agendo_cita", "agendo_llamada", "asesorado", "contrato_firmado", "no_asistio", "perdido"].filter((c) => claves.includes(c)),
    ["nuevo", "contactado", "agendo_cita", "agendo_llamada", "asesorado", "contrato_firmado", "no_asistio", "perdido"],
    "faltan etapas por defecto",
  );
  assert.equal((await ui("recepcion", "/api/embudo/etapas", "POST", { nombre: "No asistió" })).status, 403, "solo admin edita etapas");
  assert.equal((await ui("abogada", "/api/embudo/etapas", "POST", { nombre: "x" })).status, 403);
  const creada = await ui("admin", "/api/embudo/etapas", "POST", { nombre: `No asistió ${corrida}`, color: "#dc2626" });
  assert.equal(creada.status, 201);
  etapaPropia = creada.json.etapa;
  assert.equal(etapaPropia.clave, null, "una etapa propia no tiene clave");
  assert.equal((await ui("admin", `/api/embudo/etapas/${etapas.find((e) => e.clave === "asesorado").id}`, "DELETE")).status, 409, "no se quita una etapa del sistema");
  const renombrada = await ui("admin", `/api/embudo/etapas/${etapas.find((e) => e.clave === "nuevo").id}`, "PATCH", { nombre: "Nuevo" });
  assert.equal(renombrada.status, 200);
  assert.equal((await ui("admin", `/api/embudo/etapas/${etapaPropia.id}`, "PATCH", { color: "rojo" })).status, 400);

  // ================================================================== 2. nace en "Nuevo"
  await entrante(telA, `wamid.embudo.${corrida}.a`, "Persona Embudo A");
  await esperar((e) => e.event === "conversation_created", "conversation_created");
  assert.equal(await claveActual(telA), "nuevo", "una conversación nueva queda en Nuevo");
  const { tarjeta: tA } = await tarjetaPorTel(telA);
  const numeroA = tA.numero;
  assert.equal((await v1(`/conversations/${numeroA}`)).json.funnel_stage.key, "nuevo");

  // ================================================================== 3. el bot mueve la tarjeta (API compatible)
  recibidos.length = 0;
  let r = await v1(`/conversations/${numeroA}/funnel`, { metodo: "POST", cuerpo: { etapa: "Agendó cita" } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.stage.key, "agendo_cita");
  assert.equal(await claveActual(telA), "agendo_cita");
  const aviso = await esperar((e) => e.event === "conversation_updated" && e.changed_attributes?.[0]?.funnel_stage, "conversation_updated por cambio de etapa");
  assert.equal(aviso.changed_attributes[0].funnel_stage.current_value, "Agendó cita");
  r = await v1(`/conversations/${numeroA}/funnel`, { metodo: "POST", cuerpo: { etapa: "agendo_llamada" } });
  assert.equal(r.json.stage.key, "agendo_llamada", "también acepta la clave");
  r = await v1(`/conversations/${numeroA}/funnel`, { metodo: "POST", cuerpo: { etapa: "Inventada" } });
  assert.equal(r.status, 422);
  assert.ok(r.json.stages.length >= 5, "al no existir devuelve las etapas válidas");
  assert.equal((await v1(`/conversations/${numeroA}/funnel`)).json.stage.key, "agendo_llamada");

  // ================================================================== 4. eventos del despacho: ligan y avanzan
  await entrante(telB, `wamid.embudo.${corrida}.b`, "Persona Embudo B");
  await esperar((e) => e.event === "message_created" && e.sender?.name === "Persona Embudo B", "entrante B");
  const { tarjeta: tB } = await tarjetaPorTel(telB);
  const numeroB = tB.numero;
  const e164B = `+521${telB}`;

  // el bot registra al prospecto para llamada
  r = await n8n("/prospectos", "POST", { nombre: "Persona Embudo B", telefono: e164B, conversationId: String(numeroB) });
  assert.ok([200, 201].includes(r.status), JSON.stringify(r.json));
  assert.equal(await claveActual(telB), "agendo_llamada");

  // agenda cita presencial: avanza y queda ligada al chat
  const manana = new Date(Date.now() + 86_400_000).toISOString();
  r = await n8n("/citas", "POST", { cliente: "Persona Embudo B", telefono: e164B, fechaHora: manana, asunto: "Divorcio", conversationId: String(numeroB) });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(await claveActual(telB), "agendo_cita");
  const idInternoB = tB.id;
  let detalle = (await ui("admin", `/api/conversaciones/${idInternoB}`)).json.conversacion;
  assert.equal(detalle.citas.length, 1, "la cita queda ligada al chat");
  assert.equal(detalle.etapa.nombre, "Agendó cita");

  // sin conversationId: se liga por teléfono
  r = await n8n("/citas", "POST", { cliente: "Persona Embudo B", telefono: telB, fechaHora: new Date(Date.now() + 2 * 86_400_000).toISOString(), asunto: "Seguimiento" });
  assert.equal(r.status, 201);
  detalle = (await ui("admin", `/api/conversaciones/${idInternoB}`)).json.conversacion;
  assert.equal(detalle.citas.length, 2, "se liga por teléfono cuando el bot no manda el id");

  // registra la asesoría
  r = await n8n("/asesorias", "POST", { nombre: "Persona Embudo B", telefono: e164B, tema: "Divorcio", abogado: "Abogada Demo", sucursal: "Tuxtla" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const asesoriaId = r.json.data.id;
  assert.equal(await claveActual(telB), "asesorado");
  detalle = (await ui("admin", `/api/conversaciones/${idInternoB}`)).json.conversacion;
  assert.equal(detalle.asesorias.length, 1);

  // firma del contrato
  r = await n8n(`/asesorias/${asesoriaId}`, "PATCH", { status: "contrato_firmado" });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(await claveActual(telB), "contrato_firmado");

  // un evento tardío no regresa la tarjeta
  r = await n8n("/citas", "POST", { cliente: "Persona Embudo B", telefono: e164B, fechaHora: new Date(Date.now() + 3 * 86_400_000).toISOString(), conversationId: String(numeroB) });
  assert.equal(r.status, 201);
  assert.equal(await claveActual(telB), "contrato_firmado", "los eventos automáticos solo avanzan");

  // ================================================================== 5. a mano, y las etapas propias no se mueven solas
  r = await ui("recepcion", `/api/conversaciones/${tB.id}/etapa`, "POST", { etapaId: etapaPropia.id });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal((await claveActual(telB)).startsWith("propia:"), true);
  r = await n8n("/citas", "POST", { cliente: "Persona Embudo B", telefono: e164B, fechaHora: new Date(Date.now() + 4 * 86_400_000).toISOString() });
  assert.equal(r.status, 201);
  assert.ok((await claveActual(telB)).startsWith("propia:"), "una etapa propia del despacho no se mueve sola");
  assert.equal((await ui("admin", `/api/embudo/etapas/${etapaPropia.id}`, "DELETE")).status, 409, "no se quita una etapa con conversaciones");
  assert.equal((await ui("recepcion", `/api/conversaciones/${tB.id}/etapa`, "POST", { etapaId: "no-existe" })).status, 400);

  // ================================================================== 5b. llamadas, no-show y descartado
  const telC = `9642${corrida}`;
  const e164C = `+521${telC}`;
  await entrante(telC, `wamid.embudo.${corrida}.c`, "Persona Embudo C");
  await esperar((e) => e.event === "message_created" && e.sender?.name === "Persona Embudo C", "entrante C");
  assert.equal(await claveActual(telC), "nuevo");
  r = await n8n("/prospectos", "POST", { nombre: "Persona Embudo C", telefono: e164C });
  const prospectoC = r.json.data.id;
  assert.equal(await claveActual(telC), "agendo_llamada");
  r = await n8n(`/prospectos/${prospectoC}`, "PATCH", { estado: "no_contesto" });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(await claveActual(telC), "contactado", "llamaron y no contestó = Contactado");
  r = await n8n("/citas", "POST", { cliente: "Persona Embudo C", telefono: e164C, fechaHora: new Date(Date.now() + 86_400_000).toISOString() });
  const citaC = r.json.data.id;
  assert.equal(await claveActual(telC), "agendo_cita");
  r = await n8n(`/citas/${citaC}`, "PATCH", { estado: "no_show" });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(await claveActual(telC), "no_asistio", "no llegó a su cita");
  r = await n8n("/citas", "POST", { cliente: "Persona Embudo C", telefono: e164C, fechaHora: new Date(Date.now() + 2 * 86_400_000).toISOString() });
  assert.equal(await claveActual(telC), "agendo_cita", "volvió a agendar");
  r = await n8n(`/prospectos/${prospectoC}`, "PATCH", { estado: "descartado" });
  assert.equal(await claveActual(telC), "perdido", "descartado = Perdido");
  r = await n8n("/citas", "POST", { cliente: "Persona Embudo C", telefono: e164C, fechaHora: new Date(Date.now() + 3 * 86_400_000).toISOString() });
  assert.equal(await claveActual(telC), "agendo_cita", "un perdido que vuelve a agendar se reactiva");

  // ================================================================== 6. visibilidad del tablero
  const idsRecepcion = new Set((await tablero("recepcion")).tarjetas.map((c) => c.numero));
  assert.ok(idsRecepcion.has(numeroA) && idsRecepcion.has(numeroB), "recepción ve todas las tarjetas");
  const idsAbogada = (await tablero("abogada")).tarjetas.map((c) => c.numero);
  assert.ok(!idsAbogada.includes(numeroA) && !idsAbogada.includes(numeroB), "una abogada no ve tarjetas ajenas");
  assert.equal((await ui("abogada", `/api/conversaciones/${tA.id}/etapa`, "POST", { etapaId: etapas[0].id })).status, 404);
  await ui("recepcion", `/api/conversaciones/${tA.id}`, "PATCH", { responsableId: abogada.id });
  assert.ok((await tablero("abogada")).tarjetas.some((c) => c.numero === numeroA), "al asignarle la conversación, aparece en su tablero");
  assert.equal((await ui("abogada", "/api/embudo")).json.acceso.alcance, "propias");
  assert.equal((await ui("abogada", `/api/embudo/etapas/${etapaPropia.id}`, "PATCH", { nombre: "x" })).status, 403);

  // ================================================================== 7. limpieza de la etapa de prueba
  await ui("admin", `/api/conversaciones/${tB.id}/etapa`, "POST", { etapaId: etapas.find((e) => e.clave === "nuevo").id });
  assert.equal((await ui("admin", `/api/embudo/etapas/${etapaPropia.id}`, "DELETE")).status, 200);
  etapaPropia = null;

  console.log("ok: embudo — etapas configurables, bot mueve, eventos ligan citas/asesorías y solo avanzan, visibilidad");
} finally {
  if (etapaPropia) await ui("admin", `/api/embudo/etapas/${etapaPropia.id}`, "DELETE").catch(() => {});
  if (idWebhook) await ui("admin", `/api/chat/webhooks/${idWebhook}`, "DELETE").catch(() => {});
  if (idToken) await ui("admin", `/api/chat/tokens/${idToken}`, "DELETE").catch(() => {});
  await prisma.$disconnect();
  receptor.close();
}
