import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { autorizarRuta, rutaPublicaSinSesion } from "../src/lib/autorizacion-middleware.ts";
import { claveTelefono, normalizarTelefonoWhatsapp } from "../src/lib/chat/telefono.ts";
import { pollingPermitido } from "../src/lib/chat/polling.ts";
import { normalizarMensajesMeta } from "../src/lib/channel/normalizar.ts";
import { cifrarTokenMeta, descifrarTokenMeta } from "../src/lib/meta/credentials.ts";
import { verificarFirmaMeta } from "../src/lib/meta/signature.ts";
import { estadoVentana } from "../src/lib/meta/ventana.ts";

test("normaliza 52 y 521 sin truncar números no mexicanos", () => {
  assert.equal(claveTelefono("+52 961 123 4567"), "9611234567");
  assert.equal(claveTelefono("5219611234567"), "9611234567");
  assert.equal(claveTelefono("34911223344"), "34911223344");
  assert.deepEqual(normalizarTelefonoWhatsapp("5219611234567", "x"), {
    telefono: "529611234567",
    clave: "9611234567",
  });
  assert.doesNotThrow(() => normalizarTelefonoWhatsapp(null, "wamid.abc"));
});

test("mapea todos los tipos desconocidos de Meta a texto y no pierde mensajes", () => {
  const tipos = ["sticker", "reaction", "button", "interactive", "contacts", "unsupported", "system", "nuevo_tipo"];
  const payload = {
    entry: [{ changes: [{ value: { messages: tipos.map((type, index) => ({ id: `wamid.${index}`, from: "5219611234567", type })) } }] }],
  };
  const mensajes = normalizarMensajesMeta(payload);
  assert.equal(mensajes.length, tipos.length);
  for (const mensaje of mensajes) {
    assert.equal(mensaje.tipo, "texto");
    assert.match(mensaje.contenido, /^\[tipo no soportado:/);
  }
});

test("los botones de plantilla e interactivos llegan como el texto del botón", () => {
  const messages = [
    { id: "wamid.a", from: "5219611234567", type: "button", button: { text: "Confirmo asistencia", payload: "Confirmo asistencia" } },
    { id: "wamid.b", from: "5219611234567", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "1", title: "Necesito reprogramar" } } },
  ];
  const mensajes = normalizarMensajesMeta({ entry: [{ changes: [{ value: { messages } }] }] });
  assert.deepEqual(mensajes.map((m) => m.contenido), ["Confirmo asistencia", "Necesito reprogramar"]);
});

test("solo el webhook exacto puede pasar middleware sin sesión", () => {
  assert.equal(rutaPublicaSinSesion("/api/meta/webhook"), true);
  assert.equal(rutaPublicaSinSesion("/api/meta/webhook/extra"), false);
  assert.equal(autorizarRuta("/api/conversaciones", false), false);
  assert.equal(autorizarRuta("/api/wa/manual", false), false);
  assert.equal(autorizarRuta("/api/conversaciones", true), true);
});

test("polling corre solo con la pestaña visible", () => {
  assert.equal(pollingPermitido("visible"), true);
  assert.equal(pollingPermitido("hidden"), false);
  assert.equal(pollingPermitido("prerender"), false);
});

test("valida firma HMAC sobre el cuerpo crudo", () => {
  const secreto = "app-secret-demo";
  const body = JSON.stringify({ demo: true });
  const firma = `sha256=${createHmac("sha256", secreto).update(body).digest("hex")}`;
  assert.equal(verificarFirmaMeta(body, firma, secreto), true);
  assert.equal(verificarFirmaMeta(`${body} `, firma, secreto), false);
});

test("cifra el token con AES-256-GCM y lo recupera", () => {
  process.env.META_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const cifrado = cifrarTokenMeta("token-demo-que-no-debe-aparecer-en-respuestas");
  assert.ok(cifrado.startsWith("encv1:"));
  assert.equal(descifrarTokenMeta(cifrado), "token-demo-que-no-debe-aparecer-en-respuestas");
});

test("ventana de 24 horas abre y cierra en el límite", () => {
  const ahora = new Date("2026-10-12T18:00:00.000Z");
  assert.equal(estadoVentana("2026-10-11T18:00:01.000Z", ahora).abierta, true);
  assert.equal(estadoVentana("2026-10-11T18:00:00.000Z", ahora).abierta, false);
});
