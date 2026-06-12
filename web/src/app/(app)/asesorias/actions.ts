"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { requireSession } from "@/lib/guard";
import type { StatusAsesoria } from "@/lib/constants";

export type FormAsesoria = {
  nombre: string;
  telefono: string;
  asunto: string;
  sucursal: string;
  abogado: string;
  pago: boolean;
  monto: number | null;
  status: StatusAsesoria;
};

export async function crearAsesoriaAction(form: FormAsesoria) {
  await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  await prisma.asesoria.create({
    data: {
      nombre: form.nombre,
      telefono: form.telefono || null,
      tema: form.asunto || null,
      pagoAsesoria: form.pago,
      monto: form.pago && form.monto ? form.monto : null,
      status: form.status,
      abogadoId,
      sucursalId,
      origen: "web",
    },
  });
  revalidatePath("/asesorias");
}

export async function editarAsesoriaAction(id: string, form: FormAsesoria) {
  await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  await prisma.asesoria.update({
    where: { id },
    data: {
      nombre: form.nombre,
      telefono: form.telefono || null,
      tema: form.asunto || null,
      pagoAsesoria: form.pago,
      monto: form.pago && form.monto ? form.monto : null,
      status: form.status,
      abogadoId,
      sucursalId,
    },
  });
  revalidatePath("/asesorias");
}

export async function borrarAsesoriaAction(id: string) {
  await requireSession();
  await prisma.asesoria.delete({ where: { id } });
  revalidatePath("/asesorias");
}
