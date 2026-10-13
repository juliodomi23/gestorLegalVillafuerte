import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Sesion } from "@/lib/guard";
import { alcanceDe, type Alcance } from "./alcance";

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

// Qué conversaciones puede ver la persona. Administración y recepción ven todas;
// "por atender" (requiereAtencion) es una vista, no un límite. El resto, solo las suyas.
export function filtroConversaciones(acceso: AccesoChat): Prisma.ConversacionWhereInput {
  if (acceso.alcance === "propias") return { responsableId: acceso.usuarioId };
  return {};
}
