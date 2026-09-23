// Check del conteo de citas del tablero. Correr con:
//   node --experimental-strip-types src/lib/citas-reporte-regla.test.ts
import assert from "node:assert/strict";
import { contarCitas, tasaAsistencia } from "./citas-reporte-regla.ts";

const hoy = "2026-09-23";
const asesorias = { "2026-09-21": [{ nombre: "Juan Pérez López", telefono: "9612641203" }] };

const citas = [
  { fechaDia: "2026-09-21", estado: "agendada", nombre: "Juan Perez", telefono: null }, // llegó (por nombre)
  { fechaDia: "2026-09-21", estado: "agendada", nombre: "Asesoría Eunice +52 961 264 1203", telefono: null }, // llegó (teléfono en el nombre)
  { fechaDia: "2026-09-21", estado: "agendada", nombre: "María Gómez", telefono: "9610000000" }, // no llegó
  { fechaDia: "2026-09-21", estado: "cancelada", nombre: "Pedro Ruiz", telefono: null }, // baja
  { fechaDia: "2026-09-23", estado: "agendada", nombre: "Hoy Cliente", telefono: null }, // hoy: por venir
  { fechaDia: "2026-09-25", estado: "confirmada", nombre: "Futuro Cliente", telefono: null }, // por venir
];

const c = contarCitas(citas, asesorias, hoy);
assert.deepEqual(c, { agendadas: 6, asistieron: 2, noLlegaron: 1, canceladas: 1, porVenir: 2 });
assert.equal(tasaAsistencia(c), 67);

// Sin citas vencidas no hay porcentaje.
assert.equal(tasaAsistencia(contarCitas([], {}, hoy)), null);

console.log("ok");
