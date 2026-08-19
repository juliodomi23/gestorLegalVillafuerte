// Check de las reglas del reloj checador. Correr con:
//   node --experimental-strip-types src/lib/checador.test.ts
import assert from "node:assert/strict";
import {
  slugSucursal,
  tipoDespuesDe,
  evaluarGeocerca,
  minutosDeHora,
} from "./checador-regla.ts";

// El slug de la URL /checar/[sucursal] sale del nombre con acentos y espacios.
assert.equal(slugSucursal("San Cristóbal"), "san-cristobal");
assert.equal(slugSucursal("Tuxtla"), "tuxtla");

// Alternancia entrada/salida.
const t = (h: number) => new Date(Date.UTC(2026, 7, 19, h));
assert.equal(tipoDespuesDe(null), "entrada");
assert.equal(tipoDespuesDe({ tipo: "salida", creadoEn: t(0) }, t(9)), "entrada");
assert.equal(tipoDespuesDe({ tipo: "entrada", creadoEn: t(9) }, t(18)), "salida");
// Se le olvidó la salida ayer: al día siguiente vuelve a ser entrada, no salida.
assert.equal(tipoDespuesDe({ tipo: "entrada", creadoEn: t(9) }, new Date(Date.UTC(2026, 7, 20, 9))), "entrada");

// Geocerca. Tuxtla ~ 16.7531, -93.1156; 0.001° de latitud ≈ 111 m.
const sucursal = { lat: 16.7531, lon: -93.1156, radioM: 100 };
assert.equal(evaluarGeocerca(sucursal, 16.7531, -93.1156, 10), "dentro");
assert.equal(evaluarGeocerca(sucursal, 16.7631, -93.1156, 10), "fuera"); // ~1.1 km
// GPS impreciso: el margen ensancha el radio, pero topado a 200 m.
assert.equal(evaluarGeocerca(sucursal, 16.7541, -93.1156, 150), "dentro"); // ~111 m, radio 250
assert.equal(evaluarGeocerca(sucursal, 16.7561, -93.1156, 5000), "fuera"); // ~333 m, radio 300
// Sin geocerca configurada o sin GPS: no se bloquea a nadie.
assert.equal(evaluarGeocerca({ lat: null, lon: null, radioM: 100 }, 0, 0, 5), "sin_verificar");
assert.equal(evaluarGeocerca(sucursal, null, null, null), "sin_verificar");

assert.equal(minutosDeHora("09:30"), 570);

console.log("checador: OK");
