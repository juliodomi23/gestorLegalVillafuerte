import test from "node:test";
import assert from "node:assert/strict";
import { autorizarRuta, rutaPublicaSinSesion } from "../src/lib/autorizacion-middleware.ts";
import { e164Whatsapp, sourceIdWhatsapp } from "../src/lib/chat/telefono.ts";
import { extensionPermitida, sePuedeMostrarEnLinea } from "../src/lib/chat/media.ts";
import {
  atributosValidos,
  crearLimitador,
  esperaReintentoMs,
  estadoChatwoot,
  estadoGestor,
  evaluarUrlWebhook,
  firmarWebhook,
  generarToken,
  hashToken,
  parsearIdNumerico,
  sanitizarEtiquetas,
  variablesDePlantillaApi,
} from "../src/lib/bot/puro.ts";

test("teléfonos: +521 y 521 para mexicanos, dígitos completos para extranjeros", () => {
  assert.equal(e164Whatsapp("9611234567"), "+5219611234567");
  assert.equal(e164Whatsapp("+52 961 123 4567"), "+5219611234567");
  assert.equal(e164Whatsapp("5219611234567"), "+5219611234567");
  assert.equal(sourceIdWhatsapp("+5219611234567"), "5219611234567");
  assert.equal(e164Whatsapp("14155550100"), "+14155550100");
  assert.equal(sourceIdWhatsapp("14155550100"), "14155550100");
  assert.equal(e164Whatsapp(""), "");
});

test("estados Chatwoot <-> GestorLegal", () => {
  assert.equal(estadoChatwoot("abierta"), "open");
  assert.equal(estadoChatwoot("cerrada"), "resolved");
  assert.equal(estadoChatwoot("pospuesta"), "snoozed");
  assert.equal(estadoChatwoot("desconocido"), "open");
  assert.equal(estadoGestor("resolved"), "resuelta");
  assert.equal(estadoGestor("pending"), "pendiente");
  assert.equal(estadoGestor("nada"), null);
});

test("etiquetas: se limpian, se deduplican y se acotan", () => {
  assert.deepEqual(sanitizarEtiquetas([" bot_off ", "bot_off", "", null, "no_asistio"]), ["bot_off", "no_asistio"]);
  assert.deepEqual(sanitizarEtiquetas("no es lista"), []);
  assert.equal(sanitizarEtiquetas(Array.from({ length: 80 }, (_, i) => `e${i}`)).length, 50);
});

test("ids numéricos: solo enteros positivos, nunca UUID", () => {
  assert.equal(parsearIdNumerico("1000042"), 1000042n);
  assert.equal(parsearIdNumerico("0"), null);
  assert.equal(parsearIdNumerico("-5"), null);
  assert.equal(parsearIdNumerico("d4000000-0000-4000-8000-000000000001"), null);
  assert.equal(parsearIdNumerico("12abc"), null);
});

test("atributos personalizados: objeto acotado", () => {
  assert.deepEqual(atributosValidos({ oferta_noshow: "2026-10-12" }), { oferta_noshow: "2026-10-12" });
  assert.equal(atributosValidos([1, 2]), null);
  assert.equal(atributosValidos(null), null);
  assert.equal(atributosValidos({ ["x".repeat(61)]: 1 }), null);
  assert.equal(atributosValidos({ largo: "x".repeat(20000) }), null);
});

test("template_params: processed_params ordenados por número", () => {
  assert.deepEqual(variablesDePlantillaApi({ 2: "lunes", 1: "Ana", 10: "z" }), ["Ana", "lunes", "z"]);
  assert.deepEqual(variablesDePlantillaApi(undefined), []);
  assert.equal(variablesDePlantillaApi({ nombre: "x" }), null);
  assert.equal(variablesDePlantillaApi(["a"]), null);
});

test("webhook saliente: solo hosts permitidos y sin credenciales en la URL", () => {
  const hosts = ["n8n.ambarrojo.cloud"];
  assert.equal(evaluarUrlWebhook("https://n8n.ambarrojo.cloud/webhook/x", hosts).ok, true);
  assert.equal(evaluarUrlWebhook("https://evil.example/webhook/x", hosts).ok, false);
  assert.equal(evaluarUrlWebhook("http://n8n.ambarrojo.cloud/webhook/x", hosts).ok, false);
  assert.equal(evaluarUrlWebhook("http://n8n.ambarrojo.cloud/webhook/x", hosts, true).ok, true);
  assert.equal(evaluarUrlWebhook("https://u:p@n8n.ambarrojo.cloud/x", hosts).ok, false);
  assert.equal(evaluarUrlWebhook("https://n8n.ambarrojo.cloud/x", []).ok, false);
  assert.equal(evaluarUrlWebhook("no es url", hosts).ok, false);
  assert.equal(evaluarUrlWebhook("https://127.0.0.1/x", hosts).ok, false);
});

test("firma del webhook y reintentos", () => {
  const firma = firmarWebhook('{"a":1}', "1700000000", "secreto");
  assert.match(firma, /^sha256=[0-9a-f]{64}$/);
  assert.notEqual(firma, firmarWebhook('{"a":2}', "1700000000", "secreto"));
  assert.equal(esperaReintentoMs(1), 30_000);
  assert.equal(esperaReintentoMs(3), 120_000);
  assert.equal(esperaReintentoMs(20), 30 * 60_000);
});

test("token de integración: aleatorio y solo se guarda su hash", () => {
  const a = generarToken();
  const b = generarToken();
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, hashToken(a.token));
  assert.equal(a.hash.length, 64);
  assert.equal(a.prefijo, a.token.slice(0, 6));
});

test("limitador: corta al pasar el máximo y se reinicia", () => {
  const limitador = crearLimitador();
  assert.equal(limitador.permitir("k", 2, 1000, 0), true);
  assert.equal(limitador.permitir("k", 2, 1000, 1), true);
  assert.equal(limitador.permitir("k", 2, 1000, 2), false);
  assert.equal(limitador.permitir("k", 2, 1000, 1500), true);
});

test("media: lista blanca de tipos y adjuntos que no se muestran en línea", () => {
  assert.equal(extensionPermitida("audio/ogg; codecs=opus"), "ogg");
  assert.equal(extensionPermitida("application/pdf"), "pdf");
  assert.equal(extensionPermitida("application/x-msdownload"), null);
  assert.equal(extensionPermitida("text/html"), null);
  assert.equal(sePuedeMostrarEnLinea("image/png"), true);
  assert.equal(sePuedeMostrarEnLinea("application/pdf"), false);
});

test("middleware: /api/v1 y el webhook se protegen solos; el resto exige sesión", () => {
  assert.equal(rutaPublicaSinSesion("/api/v1/accounts/1/conversations/5/messages"), true);
  assert.equal(rutaPublicaSinSesion("/api/meta/webhook"), true);
  assert.equal(rutaPublicaSinSesion("/api/meta/webhook/otro"), false);
  assert.equal(rutaPublicaSinSesion("/api/v1/otra-cosa"), false);
  for (const ruta of ["/api/conversaciones", "/api/chat/tokens", "/api/chat/webhooks", "/api/mensajes/enviar", "/api/wa/manual", "/chat"]) {
    assert.equal(autorizarRuta(ruta, false), false, `${ruta} quedó abierta sin sesión`);
  }
});
