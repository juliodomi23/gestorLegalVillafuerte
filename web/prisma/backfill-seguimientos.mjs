// Crea el seguimiento semanal de los expedientes activos que todavía no lo tienen.
// Idempotente: los que ya tienen seguimiento ligado se saltan.
//
// Si el cliente ya tenía un seguimiento activo con el mismo abogado dado de alta a mano,
// se liga a ese expediente en vez de duplicarlo.
// Las llamadas se reparten alternando miércoles y viernes.
//
// Probar sin escribir:  node prisma/backfill-seguimientos.mjs --dry
// Aplicar:              node prisma/backfill-seguimientos.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry");
const FRECUENCIA_DIAS = 7;

// Duplicado de proximoDiaLlamada en src/lib/fecha.ts (este script no puede importar TS).
function proximoDia(diaSemana) {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = hoy.split("-").map(Number);
  for (let i = 1; i <= 7; i++) {
    const c = new Date(Date.UTC(y, m - 1, d + i));
    if (c.getUTCDay() === diaSemana) return c;
  }
}

const expedientes = await prisma.expediente.findMany({
  where: { estado: "activo", clienteId: { not: null }, seguimiento: null },
  orderBy: { creadoEn: "asc" },
  include: { abogadoResponsable: { select: { nombre: true } } },
});

const manuales = await prisma.seguimiento.findMany({
  where: { estado: "activo", expedienteId: null },
});
const usados = new Set();

let creados = 0;
let ligados = 0;
const porAbogado = {};

for (const [i, exp] of expedientes.entries()) {
  const nombre = exp.abogadoResponsable?.nombre ?? "Sin abogado";
  porAbogado[nombre] = (porAbogado[nombre] ?? 0) + 1;

  const manual = manuales.find(
    (s) => !usados.has(s.id) && s.clienteId === exp.clienteId && s.abogadoId === exp.abogadoResponsableId,
  );
  if (manual) {
    usados.add(manual.id);
    ligados++;
    if (!dry) await prisma.seguimiento.update({ where: { id: manual.id }, data: { expedienteId: exp.id } });
    continue;
  }

  creados++;
  if (dry) continue;
  await prisma.seguimiento.create({
    data: {
      expedienteId: exp.id,
      clienteId: exp.clienteId,
      abogadoId: exp.abogadoResponsableId,
      sucursalId: exp.sucursalId,
      tipoCaso: exp.materia,
      frecuenciaDias: FRECUENCIA_DIAS,
      fechaInicio: new Date(),
      proximoLlamado: proximoDia(i % 2 === 0 ? 3 : 5),
      estado: "activo",
    },
  });
}

console.log(dry ? "[SIMULACRO] no se escribió nada" : "Listo");
console.log(`Expedientes activos sin seguimiento: ${expedientes.length}`);
console.log(`  seguimientos nuevos: ${creados}`);
console.log(`  ligados a uno manual existente: ${ligados}`);
console.log("Por abogado:", porAbogado);

await prisma.$disconnect();
