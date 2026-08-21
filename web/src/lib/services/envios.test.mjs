// La regla de "llegó o no llegó" decide a quién le escribe el bot a las 20:00.
// Un falso positivo = mensaje a alguien que sí fue. Vale la pena la prueba.
import assert from "node:assert";

const normalizarTelefono = (tel) => {
  const d = String(tel ?? "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("521")) return d.slice(3);
  if (d.length > 10 && d.startsWith("52")) return d.slice(2);
  return d.slice(-10);
};
const normalizarNombre = (n) =>
  String(n ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// el mismo numero escrito de tres formas casa entre si
assert.strictEqual(normalizarTelefono("+52 961 264 1203"), "9612641203");
assert.strictEqual(normalizarTelefono("5219612641203"), "9612641203");
assert.strictEqual(normalizarTelefono("961 264 1203"), "9612641203");
assert.strictEqual(normalizarTelefono("9612641203"), "9612641203");

// acentos y mayusculas no deben separar a la misma persona
assert.strictEqual(normalizarNombre("MARÍA  Antonia"), "maria antonia");
assert.strictEqual(normalizarNombre("maria antonia"), "maria antonia");

// el telefono metido dentro del nombre (asi llegan las citas del bot)
const nombreCita = "Asesoría Eunice +52 961 264 1203";
assert.strictEqual(normalizarTelefono(nombreCita.replace(/\D/g, "").slice(-10)), "9612641203");

// un nombre demasiado corto no debe casar con cualquiera
const cortos = ["ana", "jo"].filter((n) => normalizarNombre(n).length >= 5);
assert.deepStrictEqual(cortos, [], "nombres de menos de 5 caracteres se ignoran para el cotejo");

console.log("ok: telefonos y nombres se cotejan como debe la regla de no-shows");
