// Los descuentos y el semáforo salen de aquí: vale la pena que cuadren con el reglamento.
import assert from "node:assert";
const N = 5;
const dias = (men, may) => men * 0.5 + Math.floor(men / N) + may;
const semaforo = (men, may) =>
  may >= N || men >= N ? "critico" : (may > 0 || men >= 3 ? "atencion" : "ok");

// Un retardo menor = medio día
assert.strictEqual(dias(1, 0), 0.5);
assert.strictEqual(dias(2, 0), 1);
// Al quinto menor: 5 x 0.5 = 2.5, más un día completo por la acumulación = 3.5
assert.strictEqual(dias(5, 0), 3.5, "cinco menores: 2.5 + 1 dia por acumulacion");
// Un retardo mayor = un día completo
assert.strictEqual(dias(0, 1), 1);
assert.strictEqual(dias(0, 3), 3);
// Mezcla
assert.strictEqual(dias(2, 1), 2, "dos menores (1) + un mayor (1)");

// Semáforo
assert.strictEqual(semaforo(0, 0), "ok");
assert.strictEqual(semaforo(2, 0), "ok", "dos menores todavia no alarman");
assert.strictEqual(semaforo(3, 0), "atencion");
assert.strictEqual(semaforo(0, 1), "atencion", "un mayor ya es atencion");
assert.strictEqual(semaforo(5, 0), "critico", "cinco menores: descuento de un dia");
assert.strictEqual(semaforo(0, 5), "critico", "cinco mayores: causal de despido");

console.log("ok: descuentos y semaforo cuadran con el reglamento");
