// Check del cumplimiento de Productividad. Correr con:
//   node --experimental-strip-types src/lib/productividad-regla.test.ts
import assert from "node:assert";
import { resumirCumplimiento } from "./productividad-regla.ts";

const grupos = resumirCumplimiento([
  { nombre: "Alain Aquiahuatl Gomez", respuesta: "si" },
  { nombre: "Alain Aquiahuatl Gomez", respuesta: "no" },
  { nombre: "Estrella Fabiola Sanchez Vives", respuesta: "sin_respuesta" },
  { nombre: "Christian", respuesta: "si" },
  { nombre: "Ángel Raúl Camacho Constantino", respuesta: "si" }, // fuera de los grupos
]);
const por = (label: string) => grupos.find((g) => g.label === label)!;

const coord = por("Coordinadores").conteo;
assert.deepEqual([coord.si, coord.no, coord.sinRespuesta, coord.total], [1, 1, 1, 3]);
assert.equal(coord.porcentaje, 33); // "sin respuesta" cuenta como no cumplido
assert.equal(por("Directo").conteo.porcentaje, 100);
assert.equal(por("Secretaría general").conteo.porcentaje, null); // sin respuestas ≠ 0 %
assert.equal(por("Colaboradores").conteo.total, 0); // Ángel no entra a ningún grupo
console.log("ok");
