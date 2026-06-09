import { prisma } from "@/lib/prisma";
import { resolverSucursal, resolverAbogado } from "./resolvers";

export type DatosAsesoria = {
  nombre: string;
  telefono?: string;
  edad?: string;
  domicilio?: string;
  tema?: string;
  resumen?: string;
  pagoAsesoria?: boolean;
  monto?: number;
  seguimiento?: string;
  status?: "pendiente" | "contrato_firmado" | "no_regreso" | "descartado";
  abogado?: string;
  sucursal?: string;
  origen?: "web" | "whatsapp";
};

export async function registrarAsesoria(d: DatosAsesoria) {
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(d.abogado),
    resolverSucursal(d.sucursal),
  ]);

  return prisma.asesoria.create({
    data: {
      nombre: d.nombre,
      telefono: d.telefono,
      edad: d.edad,
      domicilio: d.domicilio,
      tema: d.tema,
      resumen: d.resumen,
      pagoAsesoria: d.pagoAsesoria ?? false,
      monto: d.monto,
      seguimiento: d.seguimiento,
      status: d.status ?? "pendiente",
      abogadoId,
      sucursalId,
      origen: d.origen ?? "whatsapp",
    },
  });
}
