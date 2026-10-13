// Visibilidad por persona (admin / recepción / abogado) y varios números conectados.
import assert from "node:assert/strict";
import http from "node:http";
import { createHmac, randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const baseUrl = process.env.CHAT_TEST_BASE_URL || "http://127.0.0.1:3310";
const password = process.env.CHAT_TEST_ADMIN_PASSWORD || "DemoChat123!";
const appSecret = process.env.META_APP_SECRET || "demo-app-secret";
const puertoReceptor = Number(process.env.CHAT_TEST_RECEPTOR_PUERTO_2 || 3397);
const api = `${baseUrl}/api/v1/accounts/1`;
const PHONE_ID_2 = "100000000000002";

const prisma = new PrismaClient();

// ------------------------------------------------------------------ usuarios de prueba
const hash = await bcrypt.hash(password, 10);
async function usuario(email, nombre, datos) {
  const base = { nombre, email, passwordHash: hash, debeCambiarPassword: false, activo: true, ...datos };
  return prisma.usuario.upsert({ where: { email }, update: base, create: base });
}
const recepcion = await usuario("recepcion@chat-demo.test", "Recepción Demo", { rol: "asistente", verChatRecepcion: true });
const abogada = await usuario("abogada@chat-demo.test", "Abogada Demo", { rol: "abogado", verChatRecepcion: false });
const abogado2 = await usuario("abogado2@chat-demo.test", "Abogado Dos Demo", { rol: "abogado", verChatRecepcion: false });

// ------------------------------------------------------------------ sesiones
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
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: correo, password, callbackUrl: `${baseUrl}/chat`, json: "true" }),
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
  abogado2: await iniciarSesion("abogado2@chat-demo.test"),
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

const lista = async (quien) => (await ui(quien, "/api/conversaciones")).json.conversaciones || [];
const veNumeros = async (quien) => new Set((await lista(quien)).map((c) => c.numero));

// ------------------------------------------------------------------ receptor para ver el inbox del evento
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

const corrida = String(randomInt(100000, 999999));
const telA = `9630${corrida}`;
const telB = `9631${corrida}`;
let idToken = "";
let idWebhook = "";
try {
  // ================================================================== 0. setup
  const t = await ui("admin", "/api/chat/tokens", "POST", { nombre: `acceso-${corrida}` });
  assert.equal(t.status, 201);
  token = t.json.valor;
  idToken = t.json.token.id;
  const hook = await ui("admin", "/api/chat/webhooks", "POST", { nombre: `compat-acceso-${corrida}`, url: `http://127.0.0.1:${puertoReceptor}/hook` });
  assert.equal(hook.status, 201);
  idWebhook = hook.json.webhook.id;

  // segundo número conectado (Cloud API simulada): ahora son dos inbox
  const canal2 = await ui("admin", "/api/wa/manual", "POST", {
    nombre: "Número 2 Demo", wabaId: "200000000000002", phoneNumberId: PHONE_ID_2, token: "token-demo-largo-no-real-0000000000",
  });
  assert.equal(canal2.status, 200, JSON.stringify(canal2.json));
  const canales = (await ui("admin", "/api/wa/manual")).json.canales;
  assert.ok(canales.length >= 2, "debe haber al menos dos números conectados");

  // ================================================================== 1. cola de atención
  let r = await v1("/contacts", { metodo: "POST", cuerpo: { inbox_id: 1, name: "Cliente A", phone_number: `+521${telA}` } });
  assert.equal(r.status, 200);
  const contactoA = r.json.payload.contact.id;
  r = await v1("/conversations", { metodo: "POST", cuerpo: { source_id: `521${telA}`, inbox_id: 1, contact_id: contactoA } });
  const convA = r.json.id;

  // sin etiquetas y sin responsable: la maneja el bot, nadie la tiene "por atender"
  const sinEscalar = (await lista("recepcion")).find((c) => c.numero === convA);
  assert.ok(sinEscalar, "recepción ve todas las conversaciones, incluso las que atiende el bot");
  assert.equal(sinEscalar.requiereAtencion, false, "pero no cuentan como por atender");
  assert.ok((await veNumeros("admin")).has(convA), "admin ve todas");
  assert.equal((await lista("admin")).find((c) => c.numero === convA).requiereAtencion, false);

  // el bot escala: aparece en la cola de recepción
  await v1(`/conversations/${convA}/labels`, { metodo: "POST", cuerpo: { labels: ["escalado_humano", "bot_off"] } });
  const enCola = (await lista("recepcion")).find((c) => c.numero === convA);
  assert.ok(enCola, "recepción debe ver lo que requiere atención");
  assert.equal(enCola.requiereAtencion, true);
  assert.equal((await ui("recepcion", "/api/conversaciones")).json.acceso.alcance, "recepcion");
  assert.equal((await ui("abogada", "/api/conversaciones")).json.acceso.alcance, "propias");
  assert.equal((await ui("admin", "/api/conversaciones")).json.acceso.alcance, "todas");

  // la lista está acotada: busca en toda la base, abre por número y cuenta el total real
  const porNombre = await ui("recepcion", `/api/conversaciones?q=${encodeURIComponent("Cliente A")}`);
  assert.ok(porNombre.json.conversaciones.some((c) => c.numero === convA), "q encuentra por nombre");
  assert.equal(porNombre.json.conversaciones.every((c) => /cliente a/i.test(c.contacto.nombre)), true, "q filtra de verdad");
  const porNumero = await ui("recepcion", `/api/conversaciones?q=${telA.slice(-6)}`);
  assert.ok(porNumero.json.conversaciones.some((c) => c.numero === convA), "q encuentra por teléfono");
  const porEnlace = await ui("admin", `/api/conversaciones?c=${convA}`);
  assert.ok(porEnlace.json.conversaciones.some((c) => c.numero === convA), "c abre una conversación por su número");
  assert.ok(porEnlace.json.total >= porEnlace.json.conversaciones.length, "total cuenta todas las visibles");
  assert.equal(
    (await ui("abogada", `/api/conversaciones?c=${convA}`)).json.conversaciones.some((c) => c.numero === convA),
    false,
    "c no salta la visibilidad",
  );

  // un abogado sin asignación no ve nada ni puede tocarla (404, no 403: no revela que existe)
  const idInterna = (await lista("admin")).find((c) => c.numero === convA).id;
  assert.equal((await veNumeros("abogada")).has(convA), false);
  assert.equal((await ui("abogada", `/api/conversaciones/${idInterna}`)).status, 404);
  assert.equal((await ui("abogada", `/api/conversaciones/${idInterna}/mensajes`)).status, 404);
  assert.equal((await ui("abogada", `/api/conversaciones/${idInterna}`, "PATCH", { estado: "resuelta" })).status, 404);
  assert.equal((await ui("abogada", "/api/mensajes/enviar", "POST", { conversacionId: idInterna, texto: "x", privado: true })).status, 404);

  // ================================================================== 2. recepción redirige a un abogado
  assert.equal((await ui("abogada", "/api/chat/usuarios")).status, 403, "un abogado no consulta a quién reasignar");
  const usuarios = (await ui("recepcion", "/api/chat/usuarios")).json.usuarios;
  assert.ok(usuarios.some((u) => u.id === abogada.id));
  r = await ui("recepcion", `/api/conversaciones/${idInterna}`, "PATCH", { responsableId: abogada.id });
  assert.equal(r.status, 200, JSON.stringify(r.json));

  assert.ok((await veNumeros("abogada")).has(convA), "la abogada ve lo que le asignaron");
  const trasAsignar = (await lista("recepcion")).find((c) => c.numero === convA);
  assert.ok(trasAsignar, "recepción sigue viéndola");
  assert.equal(trasAsignar.requiereAtencion, false, "al reasignarla sale de por atender");
  assert.equal(trasAsignar.responsable.id, abogada.id);
  assert.equal((await veNumeros("abogado2")).has(convA), false, "otra abogada no la ve");
  assert.ok((await veNumeros("admin")).has(convA));
  assert.equal((await ui("abogado2", `/api/conversaciones/${idInterna}`)).status, 404);

  // la abogada trabaja la suya pero no reasigna
  assert.equal((await ui("abogada", `/api/conversaciones/${idInterna}`)).status, 200);
  assert.equal((await ui("abogada", `/api/conversaciones/${idInterna}`, "PATCH", { responsableId: abogado2.id })).status, 403);
  assert.equal((await ui("abogada", `/api/conversaciones/${idInterna}`, "PATCH", { estado: "pendiente", etiquetas: ["escalado_humano", "seguimiento"] })).status, 200);
  assert.equal((await ui("abogada", "/api/mensajes/enviar", "POST", { conversacionId: idInterna, texto: "Nota de la abogada", privado: true })).status, 200);
  assert.equal((await ui("abogado2", "/api/mensajes/enviar", "POST", { conversacionId: idInterna, texto: "intruso", privado: true })).status, 404);
  assert.equal((await v1(`/conversations/${convA}`)).json.assignee_id, abogada.id, "la API ve la asignación");

  // ================================================================== 3. otras reglas de la cola
  r = await v1("/contacts", { metodo: "POST", cuerpo: { inbox_id: 1, name: "Cliente B", phone_number: `+521${telB}` } });
  const convB = (await v1("/conversations", { metodo: "POST", cuerpo: { source_id: `521${telB}`, inbox_id: 1, contact_id: r.json.payload.contact.id } })).json.id;
  const idB = (await lista("admin")).find((c) => c.numero === convB).id;
  const porAtender = async () => (await lista("recepcion")).find((c) => c.numero === convB)?.requiereAtencion;
  assert.equal(await porAtender(), false);
  await ui("admin", `/api/conversaciones/${idB}`, "PATCH", { estado: "pendiente" });
  assert.equal(await porAtender(), true, "pendiente y sin responsable = por atender");
  await ui("admin", `/api/conversaciones/${idB}`, "PATCH", { estado: "resuelta" });
  await v1(`/conversations/${convB}/labels`, { metodo: "POST", cuerpo: { labels: ["bot_off"] } });
  assert.equal(await porAtender(), false, "resuelta ya no está por atender");
  assert.ok((await veNumeros("recepcion")).has(convB), "pero recepción la sigue viendo");

  // el permiso se consulta a la base: quitarlo surte efecto sin volver a iniciar sesión
  await prisma.usuario.update({ where: { id: recepcion.id }, data: { verChatRecepcion: false } });
  assert.equal((await ui("recepcion", "/api/conversaciones")).json.acceso.alcance, "propias");
  assert.equal((await ui("recepcion", "/api/chat/usuarios")).status, 403);
  await prisma.usuario.update({ where: { id: recepcion.id }, data: { verChatRecepcion: true } });

  // el catálogo de etiquetas lo lee todo el equipo; editarlo es de admin
  for (const quien of ["recepcion", "abogada"]) {
    assert.equal((await ui(quien, "/api/chat/etiquetas")).status, 200, `${quien} no pudo leer las etiquetas`);
  }
  assert.equal((await ui("abogada", "/api/chat/etiquetas", "POST", { nombre: "x", color: "#000000" })).status, 403);

  // lo administrativo sigue siendo solo de admin
  for (const ruta of ["/api/chat/tokens", "/api/chat/webhooks"]) {
    assert.equal((await ui("recepcion", ruta)).status, 403, `${ruta} abierto a recepción`);
  }
  assert.equal((await ui("recepcion", "/api/wa/manual")).status, 403);

  // ================================================================== 4. varios números
  r = await v1(`/contacts/search?q=${encodeURIComponent(`+521${telA}`)}`);
  assert.equal(r.json.meta.count, 1);
  r = await v1(`/contacts/${contactoA}/contactable_inboxes`);
  const inboxes = r.json.payload.map((x) => x.inbox.id);
  assert.ok(inboxes.includes(1) && inboxes.length >= 2, `el contacto debe ser alcanzable por todos los números: ${inboxes}`);
  const inbox2 = Math.max(...inboxes);
  assert.ok(r.json.payload.every((x) => x.source_id === `521${telA}`));

  r = await v1("/conversations", { metodo: "POST", cuerpo: { source_id: `521${telA}`, inbox_id: inbox2, contact_id: contactoA } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const convA2 = r.json.id;
  assert.notEqual(convA2, convA, "es otra conversación, en otro número");
  assert.equal(r.json.inbox_id, inbox2);
  const repetida = await v1("/conversations", { metodo: "POST", cuerpo: { source_id: `521${telA}`, inbox_id: inbox2, contact_id: contactoA } });
  assert.equal(repetida.json.id, convA2, "no se duplica por número");

  r = await v1(`/contacts/${contactoA}/conversations`);
  const porInbox = new Set(r.json.payload.map((c) => c.inbox_id));
  assert.ok(porInbox.has(1) && porInbox.has(inbox2), "se ven las conversaciones de la persona en todos los números");
  assert.equal((await v1("/conversations", { metodo: "POST", cuerpo: { source_id: `521${telA}`, inbox_id: 999, contact_id: contactoA } })).status, 422);

  // un entrante por el segundo número queda en su canal y avisa con SU inbox
  recibidos.length = 0;
  const message = { id: `wamid.acceso.${corrida}`, from: `521${telA}`, type: "text", timestamp: String(Math.floor(Date.now() / 1000)), text: { body: "Hola por el segundo número" } };
  const payload = JSON.stringify({ entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: PHONE_ID_2 }, contacts: [{ wa_id: `521${telA}`, profile: { name: "Cliente A" } }], messages: [message] } }] }] });
  const firma = `sha256=${createHmac("sha256", appSecret).update(payload).digest("hex")}`;
  const wh = await fetch(`${baseUrl}/api/meta/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-hub-signature-256": firma }, body: payload });
  assert.equal(wh.status, 200);
  const evento = await esperar((e) => e.event === "message_created" && e.content === "Hola por el segundo número", "entrante del segundo número");
  assert.equal(evento.inbox.id, inbox2, "el webhook lleva el inbox del número por el que entró");
  assert.equal(evento.conversation.inbox_id, inbox2);
  assert.equal(evento.conversation.id, convA2);

  const todas = await lista("admin");
  const nombres = new Set(todas.filter((c) => c.numero === convA || c.numero === convA2).map((c) => c.canalNombre));
  assert.equal(nombres.size, 2, "la interfaz distingue los números");

  console.log("ok: visibilidad por persona, cola de recepción, reasignación, permisos y varios números");
} finally {
  if (idWebhook) await ui("admin", `/api/chat/webhooks/${idWebhook}`, "DELETE").catch(() => {});
  if (idToken) await ui("admin", `/api/chat/tokens/${idToken}`, "DELETE").catch(() => {});
  await prisma.$disconnect();
  receptor.close();
}
