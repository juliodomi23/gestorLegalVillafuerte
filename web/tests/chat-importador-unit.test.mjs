import test from "node:test";
import assert from "node:assert/strict";
import { claveTelefono as claveApp, e164Whatsapp, normalizarTelefonoWhatsapp, sourceIdWhatsapp } from "../src/lib/chat/telefono.ts";
import { agruparPorTelefono, claveTelefono, e164, estadoDe, etapaDe, filaMensaje, sourceId, telefonoCanonico } from "../scripts/importar-chatwoot.mjs";

test("el teléfono del importador coincide con el de la app", () => {
  for (const t of ["+5217771234567", "527771234567", "7771234567", "+1 (415) 555-0100", "52 1 777 123 4567"]) {
    assert.equal(claveTelefono(t), claveApp(t), t);
    assert.equal(e164(t), e164Whatsapp(t), t);
    assert.equal(sourceId(t), sourceIdWhatsapp(t), t);
    assert.equal(telefonoCanonico(t), normalizarTelefonoWhatsapp(t, "x").telefono, t);
  }
});

test("estado: pending y open entran abiertas, resolved cerrada", () => {
  assert.equal(estadoDe("pending"), "abierta");
  assert.equal(estadoDe("open"), "abierta");
  assert.equal(estadoDe("snoozed"), "abierta");
  assert.equal(estadoDe("resolved"), "cerrada");
});

test("etapa por etiquetas: gana la más avanzada y sin etiquetas es nuevo", () => {
  assert.equal(etapaDe([]), "nuevo");
  assert.equal(etapaDe(["bot_off", "recordatorio_enviado"]), "nuevo");
  assert.equal(etapaDe(["llamada_agendada"]), "agendo_llamada");
  assert.equal(etapaDe(["llamada_agendada", "cita_confirmada"]), "agendo_cita");
  assert.equal(etapaDe(["CITA_AGENDADA"]), "agendo_cita");
  assert.equal(etapaDe(["cita_agendada", "no_asistio"]), "no_asistio");
  assert.equal(etapaDe(["cita_agendada", "cita_cancelada"]), "contactado");
});

test("mensajes: entrante, saliente, nota privada y actividad", () => {
  const base = { id: 7, created_at: 1_700_000_000, status: "read", content: "hola" };
  assert.deepEqual(
    { d: filaMensaje({ ...base, message_type: 0 }, "c")?.direccion, s: filaMensaje({ ...base, message_type: 0 }, "c")?.status },
    { d: "entrante", s: "leido" },
  );
  assert.equal(filaMensaje({ ...base, message_type: 1 }, "c").direccion, "saliente");
  assert.equal(filaMensaje({ ...base, message_type: 1, private: true }, "c").privado, true);
  assert.equal(filaMensaje({ ...base, message_type: 2 }, "c"), null);
  assert.equal(filaMensaje({ ...base, message_type: 0, source_id: "wamid.AAA" }, "c").waMessageId, "wamid.AAA");
  assert.equal(filaMensaje({ ...base, message_type: 0, source_id: "otro" }, "c").waMessageId, null);
  const sinTexto = filaMensaje({ ...base, content: null, message_type: 0, attachments: [{ file_type: "audio" }] }, "c");
  assert.equal(sinTexto.contenido, "[audio — adjunto no importado]");
  assert.equal(filaMensaje({ ...base, message_type: 1, sender: { type: "user", id: 3 } }, "c", new Map([[3, "u-1"]])).enviadoPor, "u-1");
  assert.equal(filaMensaje({ ...base, message_type: 0, sender: { type: "contact", id: 3 } }, "c", new Map([[3, "u-1"]])).enviadoPor, null);
});

test("agrupa por teléfono: la más reciente va primero y sin teléfono se omite", () => {
  const conv = (id, tel, actividad) => ({ id, last_activity_at: actividad, meta: { sender: { phone_number: tel } } });
  const grupos = agruparPorTelefono([
    conv(1, "+5217771234567", 100),
    conv(2, "+5217771234567", 300),
    conv(3, "+5217779999999", 200),
    conv(4, "", 999),
  ]);
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos[0].convs.map((c) => c.id), [2, 1]);
  assert.equal(grupos[1].convs[0].id, 3);
});

import { errorDeMeta, normalizarEstadosMeta } from "../src/lib/channel/normalizar.ts";

test("un envío fallido conserva el código y el motivo de Meta", () => {
  assert.equal(errorDeMeta(undefined), "Meta reportó un envío fallido");
  assert.match(errorDeMeta({ code: 131049, title: "Message undeliverable" }), /^Meta 131049: Meta no entregó el mensaje de marketing/);
  assert.equal(errorDeMeta({ code: 999, title: "Algo raro", error_data: { details: "detalle útil" } }), "Meta 999: Algo raro — detalle útil");
  const estados = normalizarEstadosMeta({
    entry: [{ changes: [{ value: { statuses: [{ id: "wamid.X", status: "failed", errors: [{ code: 132001, title: "Template does not exist" }] }] } }] }],
  });
  assert.equal(estados[0].status, "fallido");
  assert.match(estados[0].error, /^Meta 132001: la plantilla no existe en ese idioma/);
});
