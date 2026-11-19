// Correr con: node --experimental-strip-types src/lib/cita-reagendada.test.ts
import assert from "node:assert/strict";
import { idsReagendadas } from "./cita-reagendada-regla.ts";

const d = (s: string) => new Date(s);
const vieja = { id: "vieja", estado: "cancelada", telefono: "961 264 1203", creadoEn: d("2026-11-10T10:00:00Z"), fechaHora: d("2026-11-18T16:00:00Z") };
const nueva = { id: "nueva", estado: "agendada", telefono: "+52 9612641203", creadoEn: d("2026-11-17T10:00:00Z"), fechaHora: d("2026-11-20T16:00:00Z") };

assert.deepEqual(idsReagendadas([vieja, nueva]), ["vieja"]);
// Cancelada sin cita nueva: sigue cancelada.
assert.deepEqual(idsReagendadas([vieja]), []);
// Otro teléfono: no es reagenda.
assert.deepEqual(idsReagendadas([vieja, { ...nueva, telefono: "9610000000" }]), []);
// Cita nueva creada semanas después de la fecha original: cliente que volvió, no reagenda.
assert.deepEqual(idsReagendadas([vieja, { ...nueva, creadoEn: d("2026-12-20T10:00:00Z") }]), []);
// Cita nueva cancelada también: no cuenta como reemplazo.
assert.deepEqual(idsReagendadas([vieja, { ...nueva, estado: "cancelada" }]), []);

console.log("cita-reagendada: ok");
