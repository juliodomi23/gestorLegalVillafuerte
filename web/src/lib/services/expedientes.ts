import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

// Calcula el siguiente folio a partir del MÁXIMO existente del año (no de un
// count(): contar reusa números al borrar expedientes y genera colisiones).
async function siguienteNumeroInterno(): Promise<string> {
  const año = new Date().getFullYear();
  const prefijo = `EXP-${año}-`;
  // Como el secuencial va con padding a 4 dígitos, el orden alfabético desc
  // coincide con el numérico y nos da el último folio usado del año.
  const ultimo = await prisma.expediente.findFirst({
    where: { numeroInterno: { startsWith: prefijo } },
    orderBy: { numeroInterno: "desc" },
    select: { numeroInterno: true },
  });
  const ultimoSec = ultimo?.numeroInterno
    ? parseInt(ultimo.numeroInterno.slice(prefijo.length), 10)
    : 0;
  const siguiente = (Number.isFinite(ultimoSec) ? ultimoSec : 0) + 1;
  return `${prefijo}${String(siguiente).padStart(4, "0")}`;
}

// ¿El error es una colisión de la constraint UNIQUE de numero_interno?
function esColisionNumeroInterno(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    (e.meta?.target as string[] | undefined)?.includes("numero_interno") === true
  );
}

export async function crearExpediente(d: DatosExpediente) {
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(d.abogado),
    resolverSucursal(d.sucursal),
  ]);
  // El cliente nuevo pertenece al abogado responsable del expediente.
  const clienteId = await upsertCliente(d.cliente, d.telefonoCliente, abogadoId);

  // El número se calcula y se inserta dentro del mismo intento. Si dos
  // expedientes se crean a la vez (bot + web) ambos pueden calcular el mismo
  // folio; la constraint UNIQUE rechaza al segundo y aquí reintentamos con el
  // siguiente número disponible en vez de fallar con un 500.
  let expediente;
  for (let intento = 0; ; intento++) {
    try {
      expediente = await prisma.expediente.create({
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
      break;
    } catch (e) {
      if (esColisionNumeroInterno(e) && intento < 5) continue;
      throw e;
    }
  }

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

export async function buscarPorCliente(nombre: string) {
  return prisma.expediente.findFirst({
    where: {
      cliente: { nombre: { contains: nombre, mode: "insensitive" } },
    },
    include: {
      cliente: true,
      abogadoResponsable: true,
      sucursal: true,
      terminos: { where: { cumplido: false }, orderBy: { vencimientoTermino: "asc" } },
      actuaciones: { orderBy: { fecha: "desc" }, take: 10 },
      audiencias: { orderBy: { fechaHora: "asc" } },
      documentos: { orderBy: { creadoEn: "desc" } },
    },
    orderBy: { creadoEn: "desc" },
  });
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
      documentos: { orderBy: { creadoEn: "desc" } },
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
