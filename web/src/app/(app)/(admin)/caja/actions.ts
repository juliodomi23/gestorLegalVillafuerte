"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverSucursal } from "@/lib/services/resolvers";

export async function crearMovimientoAction(form: {
  tipo: string;
  monto: number;
  concepto: string;
  sucursal: string;
  expediente: string;
}) {
  const sucursalId = await resolverSucursal(form.sucursal);
  let expedienteId: string | null = null;
  if (form.expediente) {
    const e = await prisma.expediente.findFirst({
      where: { OR: [{ numeroInterno: form.expediente }, { numeroJudicial: form.expediente }] },
    });
    expedienteId = e?.id ?? null;
  }
  await prisma.movimientoCaja.create({
    data: {
      tipo: form.tipo.toLowerCase(),
      monto: form.monto,
      concepto: form.concepto || null,
      sucursalId,
      expedienteId,
      origen: "web",
    },
  });
  revalidatePath("/caja");
}

export async function borrarMovimientoAction(id: string) {
  await prisma.movimientoCaja.delete({ where: { id } });
  revalidatePath("/caja");
}
