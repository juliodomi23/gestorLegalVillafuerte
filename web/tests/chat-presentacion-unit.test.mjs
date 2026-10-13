import test from "node:test";
import assert from "node:assert/strict";
import { claveDia, etiquetaDia, fechaConversacion, horaMensaje } from "../src/lib/chat/fechas.ts";
import { agruparMensajes } from "../src/lib/chat/agrupacion.ts";

const ahora = new Date(2026, 9, 13, 9, 30);
const mensaje = (timestamp, direccion = "entrante", privado = false) => ({ timestamp: new Date(timestamp).toISOString(), direccion, privado });

test("etiquetas: hoy, ayer, semana reciente, fecha y año anterior", () => {
  assert.equal(etiquetaDia(new Date(2026, 9, 13, 0, 5), ahora), "Hoy");
  assert.equal(etiquetaDia(new Date(2026, 9, 12, 23, 59), ahora), "Ayer");
  assert.equal(etiquetaDia(new Date(2026, 9, 9, 12), ahora), "viernes");
  assert.equal(etiquetaDia(new Date(2026, 9, 7, 12), ahora), "miércoles");
  assert.equal(etiquetaDia(new Date(2026, 9, 6, 12), ahora), "6 de octubre");
  assert.equal(etiquetaDia(new Date(2025, 11, 31, 12), ahora), "31 de diciembre de 2025");
  assert.equal(etiquetaDia(new Date(2026, 9, 14, 12), ahora), "14 de octubre");
});

test("el día depende del calendario, incluso entre meses, años y cambios de horario", () => {
  assert.equal(claveDia(new Date(2026, 9, 13, 0, 1)), claveDia(new Date(2026, 9, 13, 23, 59)));
  assert.notEqual(claveDia(new Date(2026, 9, 12, 23, 59)), claveDia(new Date(2026, 9, 13, 0, 1)));
  assert.equal(etiquetaDia(new Date(2025, 11, 31, 23, 59), new Date(2026, 0, 1, 0, 1)), "Ayer");
  assert.equal(etiquetaDia(new Date(2026, 1, 28), new Date(2026, 2, 1)), "Ayer");
  const zonaAnterior = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    assert.equal(etiquetaDia(new Date(2026, 2, 8, 0, 1), new Date(2026, 2, 9, 0, 1)), "Ayer");
    assert.equal(etiquetaDia(new Date(2026, 10, 1, 0, 1), new Date(2026, 10, 2, 0, 1)), "Ayer");
  } finally {
    if (zonaAnterior === undefined) delete process.env.TZ;
    else process.env.TZ = zonaAnterior;
  }
});

test("lista: hora hoy, Ayer, fecha corta y año solo cuando es distinto", () => {
  const hoy = new Date(2026, 9, 13, 8, 4).toISOString();
  assert.equal(fechaConversacion(hoy, ahora), horaMensaje(hoy));
  assert.equal(fechaConversacion(new Date(2026, 9, 12).toISOString(), ahora), "Ayer");
  const corta = fechaConversacion(new Date(2026, 9, 3).toISOString(), ahora);
  assert.match(corta, /3.*oct/);
  assert.doesNotMatch(corta, /2026/);
  assert.match(fechaConversacion(new Date(2025, 9, 3).toISOString(), ahora), /2025/);
  assert.equal(fechaConversacion(null, ahora), "");
});

test("agrupa consecutivos del mismo lado hasta cinco minutos sin mutar los mensajes", () => {
  const mensajes = [mensaje(new Date(2026, 9, 13, 10)), mensaje(new Date(2026, 9, 13, 10, 5)), mensaje(new Date(2026, 9, 13, 10, 10, 1))];
  const copia = structuredClone(mensajes);
  assert.deepEqual(agruparMensajes(mensajes).map((grupo) => grupo.length), [2, 1]);
  assert.deepEqual(mensajes, copia);
  assert.deepEqual(agruparMensajes([]), []);
});

test("separa días, dirección, notas privadas e intervalos negativos", () => {
  const mensajes = [
    mensaje(new Date(2026, 9, 12, 23, 59)), mensaje(new Date(2026, 9, 13, 0, 1)),
    mensaje(new Date(2026, 9, 13, 0, 2), "saliente"), mensaje(new Date(2026, 9, 13, 0, 3), "saliente", true),
    mensaje(new Date(2026, 9, 13, 0, 4), "saliente", true), mensaje(new Date(2026, 9, 13, 0, 3), "saliente", true),
  ];
  assert.deepEqual(agruparMensajes(mensajes).map((grupo) => grupo.length), [1, 1, 1, 2, 1]);
});
