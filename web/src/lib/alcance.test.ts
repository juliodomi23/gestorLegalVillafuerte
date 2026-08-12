// Check de la regla de visibilidad. Correr con:
//   node --experimental-strip-types src/lib/alcance.test.ts
import assert from "node:assert/strict";
import { combinar } from "./alcance-regla.ts";

// Abogado sin nada a cargo: solo se ve a sí mismo.
{
  const a = combinar("karen", { sucursalId: "tuxtla", personasACargo: [], sucursalesACargo: [] });
  assert.deepEqual(a.abogadoIds, ["karen"]);
  assert.deepEqual(a.sucursalIdsAgenda, ["tuxtla"]);
}

// Encargada de dos sucursales (Rosario: Comitán + SanCris) ve a toda esa gente.
{
  const a = combinar("rosario", {
    sucursalId: "comitan",
    personasACargo: [],
    sucursalesACargo: [
      { id: "comitan", usuarios: [{ id: "rosario" }, { id: "gisselle" }] },
      { id: "sancris", usuarios: [{ id: "pedro" }] },
    ],
  });
  assert.deepEqual(a.abogadoIds.sort(), ["gisselle", "pedro", "rosario"]);
  // comitán no se duplica aunque sea su sucursal y además la lleve
  assert.deepEqual(a.sucursalIdsAgenda, ["comitan", "sancris", "comitan"]);
}

// Encargada solo de personas (Estrella → Carolina), sin sucursales.
{
  const a = combinar("estrella", {
    sucursalId: "tuxtla",
    personasACargo: [{ id: "carolina" }],
    sucursalesACargo: [],
  });
  assert.deepEqual(a.abogadoIds.sort(), ["carolina", "estrella"]);
}

console.log("alcance: ok");
