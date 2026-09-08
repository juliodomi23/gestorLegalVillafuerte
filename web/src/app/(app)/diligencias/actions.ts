"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverAbogado, resolverSucursal, asignarFolioDiligencia } from "@/lib/services/resolvers";
import { requireSession, type Sesion } from "@/lib/guard";
import { parsear, montoSchema } from "@/lib/validaciones";

export type FormRenglon = {
  fecha: string;
  descripcion: string;
  asunto: string;
  importe: string;
};

export type FormDiligencia = {
  cliente: string;
  sucursal: string;
  abogado: string;
  fecha?: string; // yyyy-mm-dd
  renglones: FormRenglon[];
};

// Solo recepción y admin asignan la diligencia a otro abogado, igual que en asesorías:
// un server action es un endpoint HTTP y cualquiera con sesión puede invocarlo con el
// payload que quiera.
function puedeAsignar(sesion: Sesion) {
  return sesion.rol === "admin" || sesion.rol === "asistente";
}

export async function crearDiligenciaAction(form: FormDiligencia) {
  const sesion = await requireSession();
  const abogado = puedeAsignar(sesion) ? form.abogado || sesion.nombre : sesion.nombre;
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(abogado),
    resolverSucursal(form.sucursal),
  ]);
  const folio = await asignarFolioDiligencia(sucursalId);
  const renglones = form.renglones.filter((r) => r.importe);
  const diligencia = await prisma.diligencia.create({
    data: {
      folio,
      clienteNombre: form.cliente.trim() || null,
      abogadoId,
      sucursalId,
      ...(form.fecha ? { fecha: new Date(form.fecha) } : {}),
      renglones: {
        create: renglones.map((r) => ({
          descripcion: r.descripcion.trim() || null,
          asunto: r.asunto.trim() || null,
          importe: parsear(montoSchema, r.importe),
          fecha: r.fecha ? new Date(r.fecha) : new Date(),
        })),
      },
    },
  });
  revalidatePath("/diligencias");
  return diligencia.id;
}

export async function borrarDiligenciaAction(id: string) {
  await requireSession();
  await prisma.diligencia.delete({ where: { id } });
  revalidatePath("/diligencias");
}

export async function agregarRenglonAction(diligenciaId: string, data: FormRenglon) {
  await requireSession();
  const importe = parsear(montoSchema, data.importe);
  await prisma.diligenciaRenglon.create({
    data: {
      diligenciaId,
      descripcion: data.descripcion.trim() || null,
      asunto: data.asunto.trim() || null,
      importe,
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
    },
  });
  revalidatePath("/diligencias");
}

export async function borrarRenglonAction(renglonId: string) {
  await requireSession();
  await prisma.diligenciaRenglon.delete({ where: { id: renglonId } });
  revalidatePath("/diligencias");
}
