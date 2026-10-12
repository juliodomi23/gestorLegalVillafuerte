import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const baseUrl = process.env.CHAT_TEST_BASE_URL || "http://127.0.0.1:3310";
const email = process.env.CHAT_TEST_ADMIN_EMAIL || "admin@chat-demo.test";
const password = process.env.CHAT_TEST_ADMIN_PASSWORD || "DemoChat123!";
const appSecret = process.env.META_APP_SECRET || "demo-app-secret";

function cookiesDe(headers) {
  const valores = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
  return valores.map((valor) => valor.split(";", 1)[0]).join("; ");
}

async function iniciarSesion(correo = email, clave = password) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrf = await csrfResponse.json();
  let cookie = cookiesDe(csrfResponse.headers);
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: correo,
    password: clave,
    callbackUrl: `${baseUrl}/chat`,
    json: "true",
  });
  const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: form,
    redirect: "manual",
  });
  cookie = [cookie, cookiesDe(loginResponse.headers)].filter(Boolean).join("; ");
  assert.ok(cookie.includes("next-auth.session-token"), "NextAuth no devolvió cookie de sesión");
  return cookie;
}

const sinSesion = await fetch(`${baseUrl}/api/conversaciones`, { redirect: "manual" });
assert.ok([401, 302, 307].includes(sinSesion.status), `API interna expuesta sin sesión: ${sinSesion.status}`);

const cookie = await iniciarSesion();
const headersSesion = { Cookie: cookie };
const cookieAbogada = await iniciarSesion("abogada@chat-demo.test", password);
const accesoAbogada = await fetch(`${baseUrl}/api/conversaciones`, { headers: { Cookie: cookieAbogada } });
assert.equal(accesoAbogada.status, 200);
const listaAbogada = await accesoAbogada.json();
assert.equal(listaAbogada.acceso.alcance, "propias");
assert.ok(
  listaAbogada.conversaciones.every((c) => c.responsable !== null),
  "Un abogado vio conversaciones que nadie le asignó",
);
const conversacionAbierta = "d4000000-0000-4000-8000-000000000001";
const conversacionCerrada = "d4000000-0000-4000-8000-000000000004";
const idMensajeEntrante = `wamid.integration.sticker.${Date.now()}`;

async function mensajes(id) {
  const response = await fetch(`${baseUrl}/api/conversaciones/${id}/mensajes`, { headers: headersSesion });
  assert.equal(response.status, 200);
  return (await response.json()).mensajes;
}

const antes = await mensajes(conversacionAbierta);
const payload = JSON.stringify({
  entry: [{
    changes: [{
      field: "messages",
      value: {
        metadata: { phone_number_id: "100000000000001" },
        contacts: [{ wa_id: "5219615550101", profile: { name: "Mariana López Demo" } }],
        messages: [{ id: idMensajeEntrante, from: "5219615550101", type: "sticker", timestamp: String(Math.floor(Date.now() / 1000)) }],
      },
    }],
  }],
});

const invalida = await fetch(`${baseUrl}/api/meta/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-hub-signature-256": "sha256=incorrecta" },
  body: payload,
});
assert.equal(invalida.status, 401);
assert.equal((await mensajes(conversacionAbierta)).length, antes.length, "La firma inválida insertó un mensaje");

const firma = `sha256=${createHmac("sha256", appSecret).update(payload).digest("hex")}`;
const valida = await fetch(`${baseUrl}/api/meta/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-hub-signature-256": firma },
  body: payload,
});
assert.equal(valida.status, 200);
const despues = await mensajes(conversacionAbierta);
assert.equal(despues.length, antes.length + 1);
assert.equal(despues.at(-1).tipo, "texto");
assert.match(despues.at(-1).contenido, /^\[tipo no soportado:/);

const enviarTexto = await fetch(`${baseUrl}/api/mensajes/enviar`, {
  method: "POST",
  headers: { ...headersSesion, "Content-Type": "application/json" },
  body: JSON.stringify({ conversacionId: conversacionAbierta, texto: "Respuesta simulada dentro de ventana" }),
});
assert.equal(enviarTexto.status, 200);

const fueraVentana = await fetch(`${baseUrl}/api/mensajes/enviar`, {
  method: "POST",
  headers: { ...headersSesion, "Content-Type": "application/json" },
  body: JSON.stringify({ conversacionId: conversacionCerrada, texto: "No debe salir" }),
});
assert.equal(fueraVentana.status, 400);
assert.equal((await fueraVentana.json()).ventanaCerrada, true);

const plantilla = await fetch(`${baseUrl}/api/mensajes/enviar`, {
  method: "POST",
  headers: { ...headersSesion, "Content-Type": "application/json" },
  body: JSON.stringify({
    conversacionId: conversacionCerrada,
    plantilla: { name: "seguimiento_demo", language: "es_MX", variables: ["Óscar"], vistaPrevia: "Hola Óscar, damos seguimiento." },
  }),
});
assert.equal(plantilla.status, 200);

const manual = await fetch(`${baseUrl}/api/wa/manual`, { headers: headersSesion });
assert.equal(manual.status, 200);
const manualTexto = await manual.text();
assert.doesNotMatch(manualTexto, /demo-app-secret|demo-verify-token|tokenEncrypted|META_APP_SECRET|META_WEBHOOK_VERIFY_TOKEN/);

console.log("ok: integración de chat, firma, sesión, ventana y mock Cloud API");
