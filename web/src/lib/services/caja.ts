import { prisma } from "@/lib/prisma";
import { parseFecha } from "@/lib/fecha";
import { resolverSucursal, resolverAbogado } from "./resolvers";

export type DatosMovimiento = {
  tipo: "ingreso" | "egreso";
  concepto?: string;
  monto: number;
  sucursal?: string;
  numeroExpediente?: string;
  abogado?: string;
  fecha?: string;
  origen?: "web" | "whatsapp";
};

export async function registrarMovimiento(d: DatosMovimiento) {
  const [sucursalId, registradoPor] = await Promise.all([
    resolverSucursal(d.sucursal),
    resolverAbogado(d.abogado),
  ]);

  let expedienteId: string | null = null;
  if (d.numeroExpediente) {
    const e = await prisma.expediente.findFirst({
      where: { OR: [{ numeroInterno: d.numeroExpediente }, { numeroJudicial: d.numeroExpediente }] },
    });
    expedienteId = e?.id ?? null;
  }

  return prisma.movimientoCaja.create({
    data: {
      tipo: d.tipo,
      concepto: d.concepto,
      monto: d.monto,
      sucursalId,
      expedienteId,
      registradoPor,
      fecha: parseFecha(d.fecha) ?? new Date(),
      origen: d.origen ?? "whatsapp",
    },
  });
}
