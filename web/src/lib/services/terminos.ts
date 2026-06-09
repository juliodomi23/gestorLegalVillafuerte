import { prisma } from "@/lib/prisma";
import { parseFecha } from "@/lib/fecha";

export type DatosTerminoStandalone = {
  numeroExpediente: string;
  tipo?: "termino" | "prorroga" | "prevencion";
  descripcion?: string;
  fechaAcuerdo?: string;
  tipoNotificacion?: string;
  esPrevencion?: boolean;
  diasParaContestar?: number;
  inicioTermino?: string;
  vencimientoTermino?: string;
};

async function expedienteIdPorNumero(numero: string): Promise<string | null> {
  const e = await prisma.expediente.findFirst({
    where: { OR: [{ numeroInterno: numero }, { numeroJudicial: numero }] },
  });
  return e?.id ?? null;
}

export async function registrarTermino(d: DatosTerminoStandalone) {
  const expedienteId = await expedienteIdPorNumero(d.numeroExpediente);
  if (!expedienteId) throw new Error(`No se encontró el expediente ${d.numeroExpediente}`);

  return prisma.termino.create({
    data: {
      expedienteId,
      tipo: d.tipo ?? (d.esPrevencion ? "prevencion" : "termino"),
      descripcion: d.descripcion,
      fechaAcuerdo: parseFecha(d.fechaAcuerdo),
      tipoNotificacion: d.tipoNotificacion,
      esPrevencion: d.esPrevencion ?? false,
      diasParaContestar: d.diasParaContestar,
      inicioTermino: parseFecha(d.inicioTermino),
      vencimientoTermino: parseFecha(d.vencimientoTermino),
    },
  });
}

export async function resolverTermino(id: string) {
  return prisma.termino.update({ where: { id }, data: { cumplido: true } });
}
