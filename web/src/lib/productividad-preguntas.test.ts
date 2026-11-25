// Correr con: node --experimental-strip-types src/lib/productividad-preguntas.test.ts
import assert from "node:assert/strict";
import { destinatariosDe, tocaEnviar, dentroDeTiempo } from "./productividad-preguntas-regla.ts";

assert.deepEqual(destinatariosDe("Preguntar al colaborador Fernando Salas si ya revisó los acuerdos"), ["Fernando Salas"]);
assert.deepEqual(destinatariosDe("Preguntar al director si ya realizó las preguntas para el crecimiento"), ["Christian"]);
assert.equal(destinatariosDe("Mandar mensaje a los coordinadores para saber si").length, 3);
assert.deepEqual(destinatariosDe("Otra cosa"), []);
assert.deepEqual(destinatariosDe("Preguntar al lic Villafuerte si ya mando a la secretaria general las personas citadas"), ["Christian"]);
assert.deepEqual(destinatariosDe("Preguntar a la secretaria General si ya le mando al licenciado Villafuerte la información"), ["Karen"]);
assert.deepEqual(destinatariosDe("Escribir a la secretaria general para preguntarle si ya recabó"), ["Karen"]);
assert.deepEqual(destinatariosDe("Preguntar a los colaboradores si ellos, sus colaboradores y titulares presentaron demandas y si le pasaron los datos al director."), ["Carolina", "Giselle", "Fernando Salas"]);
assert.equal(destinatariosDe("Preguntar a los coordinadores si sus colaboradores o titulares ya pasaron la información").length, 3);

assert.equal(tocaEnviar("12:00", "11:59"), false);
assert.equal(tocaEnviar("12:00", "12:00"), true);
assert.equal(tocaEnviar("12:00", "12:14"), true);
assert.equal(tocaEnviar("12:00", "12:15"), false);

const t = new Date("2026-11-20T12:00:00Z");
assert.equal(dentroDeTiempo(t, new Date("2026-11-20T12:20:00Z")), true);
assert.equal(dentroDeTiempo(t, new Date("2026-11-20T12:20:01Z")), false);
console.log("ok");
