import { prisma } from "@/lib/prisma";
import { alcanceDe } from "@/lib/alcance";
import { diligenciaEditablePorAbogado } from "@/lib/fecha";
import type { Sesion } from "@/lib/guard";

export function puedeGestionarDiligencias(sesion: Sesion): boolean {
  return sesion.rol === "admin" || sesion.rol === "asistente";
}

export async function puedeVerTodasDiligencias(
  userId: string | undefined,
  rol: string | undefined
): Promise<boolean> {
  if (rol === "admin") return true;
  if (!userId) return false;
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { verTodasDiligencias: true },
  });
  return !!usuario?.verTodasDiligencias;
}

export async function tieneAccesoDiligencia(
  diligenciaId: string,
  sesion: Pick<Sesion, "id" | "rol">
): Promise<boolean> {
  if (sesion.rol === "admin" || await puedeVerTodasDiligencias(sesion.id, sesion.rol)) return true;
  const diligencia = await prisma.diligencia.findUnique({
    where: { id: diligenciaId },
    select: { abogadoId: true },
  });
  if (!diligencia) return false;
  const alcance = await alcanceDe(sesion.id, sesion.rol);
  return !!alcance && alcance.abogadoIds.includes(diligencia.abogadoId ?? "");
}

export async function puedeEditarDiligencia(
  diligenciaId: string,
  sesion: Sesion
): Promise<boolean> {
  if (puedeGestionarDiligencias(sesion)) return true;
  const diligencia = await prisma.diligencia.findUnique({
    where: { id: diligenciaId },
    select: { abogadoId: true, fecha: true },
  });
  return !!diligencia
    && diligencia.abogadoId === sesion.id
    && diligenciaEditablePorAbogado(diligencia.fecha);
}

export async function exigirEdicionDiligencia(diligenciaId: string, sesion: Sesion) {
  if (!(await puedeEditarDiligencia(diligenciaId, sesion))) {
    throw new Error("Solo puedes modificar tus diligencias hasta el jueves de la semana en que las registraste");
  }
}
