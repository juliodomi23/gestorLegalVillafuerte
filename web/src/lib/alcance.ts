// Qué registros ve cada usuario.
//
// Regla: un abogado ve lo suyo. Un encargado ve además lo de las sucursales que
// lleva y lo de las personas que tiene asignadas directamente. Un admin ve todo.
//
// `null` = ve todo (admin): las páginas lo traducen a `where: undefined`.

import { prisma } from "@/lib/prisma";
import { combinar } from "./alcance-regla";

export { combinar };

export type Alcance = ReturnType<typeof combinar> | null;

export async function alcanceDe(
  userId: string | undefined,
  rol: string | undefined
): Promise<Alcance> {
  if (rol === "admin") return null;
  if (!userId) return { abogadoIds: [], sucursalIdsAgenda: [] };

  const u = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      sucursalId: true,
      personasACargo: { select: { id: true } },
      sucursalesACargo: { select: { id: true, usuarios: { select: { id: true } } } },
    },
  });

  return combinar(userId, u ?? { sucursalId: null, personasACargo: [], sucursalesACargo: [] });
}

// where para tablas con columna `abogadoId` (asesorías, seguimientos, citas propias).
export function porAbogado(a: Alcance) {
  return a ? { abogadoId: { in: a.abogadoIds } } : {};
}

// where para clientes: los suyos más los de los expedientes que lleva. Sin esto
// un abogado ve el expediente pero no al cliente (lo capturó recepción o el bot).
export function porCliente(a: Alcance) {
  if (!a) return {};
  return {
    OR: [
      { abogadoId: { in: a.abogadoIds } },
      { expedientes: { some: { abogadoResponsableId: { in: a.abogadoIds } } } },
    ],
  };
}

// where para citas: las de sus sucursales más las suyas propias.
export function porAgenda(a: Alcance) {
  if (!a) return {};
  return {
    OR: [
      { sucursalId: { in: a.sucursalIdsAgenda } },
      { abogadoId: { in: a.abogadoIds } },
    ],
  };
}
