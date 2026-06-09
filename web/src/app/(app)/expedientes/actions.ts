"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";

export type FormExpediente = {
  cliente: string;
  numeroJudicial: string;
  materia: string;
  etapa: string;
  abogado: string;
  sucursal: string;
};

export async function crearExpedienteAction(form: FormExpediente) {
  const [clienteId, abogadoId, sucursalId] = await Promise.all([
    upsertCliente(form.cliente),
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  const año = new Date().getFullYear();
  const total = await prisma.expediente.count();
  await prisma.expediente.create({
    data: {
      numeroInterno: `EXP-${año}-${String(total + 1).padStart(4, "0")}`,
      numeroJudicial: form.numeroJudicial || null,
      clienteId,
      materia: form.materia || null,
      etapaProcesal: form.etapa || null,
      abogadoResponsableId: abogadoId,
      sucursalId,
    },
  });
  revalidatePath("/expedientes");
}

export async function editarExpedienteAction(id: string, form: FormExpediente) {
  const [clienteId, abogadoId, sucursalId] = await Promise.all([
    upsertCliente(form.cliente),
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  await prisma.expediente.update({
    where: { id },
    data: {
      numeroJudicial: form.numeroJudicial || null,
      clienteId,
      materia: form.materia || null,
      etapaProcesal: form.etapa || null,
      abogadoResponsableId: abogadoId,
      sucursalId,
    },
  });
  revalidatePath("/expedientes");
}

export async function borrarExpedienteAction(id: string) {
  await prisma.expediente.delete({ where: { id } });
  revalidatePath("/expedientes");
}
