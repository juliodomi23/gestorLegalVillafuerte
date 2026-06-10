import { prisma } from "@/lib/prisma";
import { parseFecha } from "@/lib/fecha";
import { resolverSucursal, resolverAbogado, upsertCliente } from "./resolvers";

export type DatosExpediente = {
  numeroJudicial?: string;
  cliente: string;
  telefonoCliente?: string;
  rolCliente?: string;
  materia?: string;
  tipoJuicio?: string;
  juzgado?: string;
  etapa?: string;
  cuantia?: number;
  abogado?: string;
  sucursal?: string;
  resumen?: string;
  fechaInicio?: string;
  // Documento de Drive adjunto al crear (opcional)
  documento?: { nombre: string; linkDrive: string; tipo?: string };
  // Si el acuerdo genera un término/prevención, se crea junto:
  termino?: DatosTermino;
};

export type DatosTermino = {
  tipo?: "termino" | "prorroga" | "prevencion";
  descripcion?: string;
  fechaAcuerdo?: string;
  tipoNotificacion?: string;
  esPrevencion?: boolean;
  diasParaContestar?: number;
  inicioTermino?: string;
  vencimientoTermino?: string;
};

async function siguienteNumeroInterno(): Promise<string> {
  const año = new Date().getFullYear();
  const total = await prisma.expediente.count();
  return `EXP-${año}-${String(total + 1).padStart(4, "0")}`;
}

export async function crearExpediente(d: DatosExpediente) {
  const [clienteId, abogadoId, sucursalId] = await Promise.all([
    upsertCliente(d.cliente, d.telefonoCliente),
    resolverAbogado(d.abogado),
    resolverSucursal(d.sucursal),
  ]);

  const expediente = await prisma.expediente.create({
    data: {
      numeroInterno: await siguienteNumeroInterno(),
      numeroJudicial: d.numeroJudicial,
      clienteId,
      rolCliente: d.rolCliente,
      materia: d.materia,
      tipoJuicio: d.tipoJuicio,
      juzgado: d.juzgado,
      etapaProcesal: d.etapa,
      cuantia: d.cuantia,
      abogadoResponsableId: abogadoId,
      sucursalId,
      resumen: d.resumen,
      fechaInicio: parseFecha(d.fechaInicio),
    },
  });

  if (d.termino) {
    const t = d.termino;
    await prisma.termino.create({
      data: {
        expedienteId: expediente.id,
        tipo: t.tipo ?? (t.esPrevencion ? "prevencion" : "termino"),
        descripcion: t.descripcion,
        fechaAcuerdo: parseFecha(t.fechaAcuerdo),
        tipoNotificacion: t.tipoNotificacion,
        esPrevencion: t.esPrevencion ?? false,
        diasParaContestar: t.diasParaContestar,
        inicioTermino: parseFecha(t.inicioTermino),
        vencimientoTermino: parseFecha(t.vencimientoTermino),
      },
    });
  }

  if (d.documento?.linkDrive) {
    await prisma.documento.create({
      data: {
        expedienteId: expediente.id,
        nombre: d.documento.nombre.trim(),
        tipo: d.documento.tipo ?? "drive",
        linkDrive: d.documento.linkDrive.trim(),
      },
    });
  }

  return expediente;
}

export async function obtenerExpedientePorNumero(numero: string) {
  return prisma.expediente.findFirst({
    where: {
      OR: [{ numeroInterno: numero }, { numeroJudicial: numero }],
    },
    include: {
      cliente: true,
      abogadoResponsable: true,
      sucursal: true,
      terminos: { where: { cumplido: false }, orderBy: { vencimientoTermino: "asc" } },
      actuaciones: { orderBy: { fecha: "desc" }, take: 10 },
      audiencias: { orderBy: { fechaHora: "asc" } },
    },
  });
}

// Términos por vencer en los próximos N días (para los CRON de alertas del bot).
export async function vencimientosProximos(dias: number) {
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return prisma.termino.findMany({
    where: { cumplido: false, vencimientoTermino: { lte: limite } },
    orderBy: { vencimientoTermino: "asc" },
    include: { expediente: { include: { cliente: true, abogadoResponsable: true, sucursal: true } } },
  });
}
