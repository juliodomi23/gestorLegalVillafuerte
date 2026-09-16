// Check del ranking de Prospectos (equipos + empates). Correr con:
//   node --experimental-strip-types src/lib/equipos-prospectos.test.ts
import assert from "node:assert";
import { rankingPorEquipo, rankingPorSucursal } from "./equipos-prospectos.ts";

function abogado(nombre: string, sucursalNombre: string, llamadasHoy: number) {
  return {
    abogadoId: nombre,
    nombre,
    sucursalNombre,
    llamadasMes: 0,
    agendadasMes: 0,
    citasMes: 0,
    contratosMes: 0,
    llamadasSemana: 0,
    agendadasSemana: 0,
    citasSemana: 0,
    contratosSemana: 0,
    llamadasHoy,
    agendadasHoy: 0,
    citasHoy: 0,
    contratosHoy: 0,
  };
}

const resumen = [
  abogado("Alain Aquiahuatl Gomez", "Tuxtla", 3),
  abogado("Fernando Salas", "Tuxtla", 2), // equipo Alain+Fernando = 5
  abogado("Karen Lopez", "Comitan", 5), // individual, empata con el equipo
  abogado("Amairany Diaz", "San Cristobal", 1),
  abogado("Christian Ruiz", "Tapachula", 0), // sin actividad, no entra al ranking
];

const porEquipo = rankingPorEquipo(resumen, "llamadasHoy");
assert.deepEqual(
  porEquipo.map((i) => [i.lugar, i.label]),
  [
    [1, "Alain y Fernando"],
    [1, "Karen Lopez"],
    [3, "Amairany Diaz"],
  ],
);

const porSucursal = rankingPorSucursal(resumen, "llamadasHoy");
assert.deepEqual(
  porSucursal.map((i) => [i.lugar, i.label]),
  [
    [1, "Tuxtla"], // Alain(3) + Fernando(2) = 5
    [1, "Comitan"], // Karen sola = 5, empata con Tuxtla
    [3, "San Cristobal"],
  ],
);

console.log("ok");
