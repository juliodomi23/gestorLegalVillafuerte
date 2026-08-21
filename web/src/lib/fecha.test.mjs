// El bug que se arregla: "hoy" y "todo el día X" calculados en UTC se corren 6 horas.
import assert from "node:assert";
const OFFSET = "-06:00";
const rango = (f) => ({
  gte: new Date(`${f}T00:00:00${OFFSET}`),
  lte: new Date(`${f}T23:59:59.999${OFFSET}`),
});

// El día del despacho empieza a las 06:00 UTC y termina a las 05:59 del siguiente.
const r = rango("2026-08-21");
assert.strictEqual(r.gte.toISOString(), "2026-08-21T06:00:00.000Z");
assert.strictEqual(r.lte.toISOString(), "2026-08-22T05:59:59.999Z");

// Una cita a las 09:00 de Chiapas cae dentro de su día
const cita9am = new Date("2026-08-21T09:00:00-06:00");
assert.ok(cita9am >= r.gte && cita9am <= r.lte, "las 9am deben caer en su propio dia");

// Una cita a las 20:00 de Chiapas también (con setHours en UTC quedaba fuera)
const cita8pm = new Date("2026-08-21T20:00:00-06:00");
assert.ok(cita8pm >= r.gte && cita8pm <= r.lte, "las 8pm deben caer en su propio dia, no en el siguiente");

// Y una del día anterior a las 19:00 NO debe colarse (con el bug viejo sí)
const ayer7pm = new Date("2026-08-20T19:00:00-06:00");
assert.ok(!(ayer7pm >= r.gte), "las 7pm de ayer no pertenecen a hoy");

console.log("ok: el dia del despacho va de 00:00 a 23:59 hora de Chiapas");
