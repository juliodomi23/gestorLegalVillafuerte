// Check del turno rotativo de asesorías de Tuxtla. Correr con:
//   node --experimental-strip-types src/lib/turno.test.ts
import assert from "node:assert/strict";
import { siguienteDelTurno, coincideNombre } from "./turno-regla.ts";

const turno = ["Alain", "Estrella", "Rosario", "Fernando", "Carolina", "Karla"];

// Sin asesorías previas arranca el primero.
assert.equal(siguienteDelTurno(turno, null), "Alain");

// Avanza uno y da la vuelta.
assert.equal(siguienteDelTurno(turno, "Alain"), "Estrella");
assert.equal(siguienteDelTurno(turno, "Fernando"), "Carolina");
assert.equal(siguienteDelTurno(turno, "Karla"), "Alain");

// Recepción se saltó a alguien: el turno sigue desde quien sí atendió.
assert.equal(siguienteDelTurno(turno, "Carolina"), "Karla");

// La última la atendió alguien de fuera del turno: no rompe, empieza de nuevo.
assert.equal(siguienteDelTurno(turno, "Yazuri"), "Alain");

// Nadie del turno está activo: no sugiere a nadie.
assert.equal(siguienteDelTurno([], "Alain"), null);

// Búsqueda por palabras completas, sin acentos y sin confundir Rosa con Rosario.
assert.ok(coincideNombre("Alain Aquiahuatl Gomez", "Alain"));
assert.ok(coincideNombre("Karla Giselle Villafuerte De Paz", "Karla Giselle"));
assert.ok(coincideNombre("Ángel Raúl Camacho Constantino", "Angel Raul"));
assert.ok(!coincideNombre("Maria del Rosario Alvarez Vera", "Rosa"));
assert.ok(!coincideNombre("Fernando Salas", "Fernanda"));

console.log("ok");
