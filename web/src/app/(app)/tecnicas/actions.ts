"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/guard";
import { listarLecciones } from "@/lib/tecnicas";

export async function marcarVistaAction(leccion: string) {
  const sesion = await requireSession();
  const lecciones = await listarLecciones();
  if (!lecciones.some((l) => l.id === leccion)) throw new Error("Lección no encontrada");
  // upsert con update vacío: la fecha que cuenta es la primera vez que la terminó.
  await prisma.leccionVista.upsert({
    where: { usuarioId_leccion: { usuarioId: sesion.id, leccion } },
    create: { usuarioId: sesion.id, leccion },
    update: {},
  });
  revalidatePath("/tecnicas");
}
