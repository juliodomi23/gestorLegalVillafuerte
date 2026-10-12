import assert from "node:assert/strict";

const baseUrl = process.env.CHAT_TEST_BASE_URL;

function cookiesDe(headers) {
  const valores = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
  return valores.map((valor) => valor.split(";", 1)[0]).join("; ");
}

const webhook = await fetch(`${baseUrl}/api/meta/webhook`, { redirect: "manual" });
assert.equal(webhook.status, 404, "El webhook existe con el módulo apagado");

const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
const csrf = await csrfResponse.json();
const cookieCsrf = cookiesDe(csrfResponse.headers);
const form = new URLSearchParams({
  csrfToken: csrf.csrfToken,
  email: "admin@chat-demo.test",
  password: "DemoChat123!",
  callbackUrl: `${baseUrl}/chat`,
  json: "true",
});
const login = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieCsrf },
  body: form,
  redirect: "manual",
});
const cookieSesion = cookiesDe(login.headers);
const headers = { Cookie: `${cookieCsrf}; ${cookieSesion}` };

assert.match(cookieSesion, /next-auth\.session-token/, "NextAuth no devolvió sesión para probar el módulo apagado");
const api = await fetch(`${baseUrl}/api/conversaciones`, { headers, redirect: "manual" });
const apiTexto = await api.text();
assert.equal(api.status, 404, `La API existe con el módulo apagado: ${apiTexto.slice(0, 200)}`);

const pagina = await fetch(`${baseUrl}/chat`, { headers, redirect: "manual" });
assert.equal(pagina.status, 404, "La página existe con el módulo apagado");

const inicio = await fetch(`${baseUrl}/inicio`, { headers });
assert.equal(inicio.status, 200);
assert.doesNotMatch(await inicio.text(), /href="\/chat"/, "El menú muestra Chat con el módulo apagado");

console.log("ok: módulo apagado oculta webhook, API y página");
