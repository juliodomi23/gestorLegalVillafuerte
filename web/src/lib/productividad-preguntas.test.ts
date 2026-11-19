// Correr con: node --experimental-strip-types src/lib/productividad-preguntas.test.ts
import assert from "node:assert/strict";
import { destinatariosDe, tocaEnviar, dentroDeTiempo } from "./productividad-preguntas-regla.ts";

assert.deepEqual(destinatariosDe("Preguntar al colaborador Fernando Salas si ya revisó los acuerdos"), ["Fernando Salas"]);
assert.deepEqual(destinatariosDe("Preguntar al director si ya realizó las preguntas para el crecimiento"), ["Christian"]);
assert.equal(destinatariosDe("Mandar mensaje a los coordinadores para saber si").length, 3);
assert.deepEqual(destinatariosDe("Otra cosa"), []);

assert.equal(tocaEnviar("12:00", "11:59"), false);
assert.equal(tocaEnviar("12:00", "12:00"), true);
assert.equal(tocaEnviar("12:00", "12:14"), true);
assert.equal(tocaEnviar("12:00", "12:15"), false);

const t = new Date("2026-11-20T12:00:00Z");
assert.equal(dentroDeTiempo(t, new Date("2026-11-20T12:20:00Z")), true);
assert.equal(dentroDeTiempo(t, new Date("2026-11-20T12:20:01Z")), false);
console.log("ok");
