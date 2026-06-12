"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverSucursal } from "@/lib/services/resolvers";
import { requireAdmin } from "@/lib/guard";
import { parsear, movimientoCajaSchema } from "@/lib/validaciones";

export async function crearMovimientoAction(form: {
  tipo: string;
  monto: number;
  concepto: string;
  sucursal: string;
  expediente: string;
}) {
  await requireAdmin();
  const d = parsear(movimientoCajaSchema, form);
  const sucursalId = await resolverSucursal(d.sucursal ?? "");
  let expedienteId: string | null = null;
  if (d.expediente) {
    const e = await prisma.expediente.findFirst({
      where: { OR: [{ numeroInterno: d.expediente }, { numeroJudicial: d.expediente }] },
    });
    expedienteId = e?.id ?? null;
  }
  await prisma.movimientoCaja.create({
    data: {
      tipo: d.tipo.toLowerCase(),
      monto: d.monto,
      concepto: d.concepto || null,
      sucursalId,
      expedienteId,
      origen: "web",
    },
  });
  revalidatePath("/caja");
}

export async function borrarMovimientoAction(id: string) {
  await requireAdmin();
  await prisma.movimientoCaja.delete({ where: { id } });
  revalidatePath("/caja");
}
