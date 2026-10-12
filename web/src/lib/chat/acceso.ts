import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Sesion } from "@/lib/guard";
import { alcanceDe, ESTADOS_ABIERTOS, ETIQUETAS_ATENCION, type Alcance } from "./alcance";

export type AccesoChat = { usuarioId: string; alcance: Alcance };

// Se consulta a la base y no a la sesión: quitar el permiso surte efecto de inmediato.
export async function resolverAcceso(sesion: Sesion): Promise<AccesoChat> {
  if (sesion.rol === "admin") return { usuarioId: sesion.id, alcance: "todas" };
  const usuario = await prisma.usuario.findUnique({
    where: { id: sesion.id },
    select: { activo: true, rol: true, verChatRecepcion: true },
  });
  if (!usuario?.activo) throw new Error("No autenticado");
  return { usuarioId: sesion.id, alcance: alcanceDe(usuario) };
}

// Misma regla que requiereAtencion() de alcance.ts, expresada como filtro de Prisma.
export function filtroConversaciones(acceso: AccesoChat): Prisma.ConversacionWhereInput {
  if (acceso.alcance === "todas") return {};
  if (acceso.alcance === "propias") return { responsableId: acceso.usuarioId };
  return {
    OR: [
      { responsableId: acceso.usuarioId },
      {
        responsableId: null,
        estado: { in: [...ESTADOS_ABIERTOS] },
        OR: [
          { estado: "pendiente" },
          { etiquetas: { some: { etiqueta: { nombre: { in: [...ETIQUETAS_ATENCION] } } } } },
        ],
      },
    ],
  };
}
