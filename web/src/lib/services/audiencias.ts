import { prisma } from "@/lib/prisma";
import { parseFecha } from "@/lib/fecha";

export type DatosAudiencia = {
  expedienteId?: string;
  numeroExpediente?: string;
  fechaHora: string;
  tipo?: string;
  lugar?: string;
};

export async function registrarAudiencia(d: DatosAudiencia) {
  const fecha = parseFecha(d.fechaHora);
  if (!fecha) throw new Error("fechaHora inválida");

  let expedienteId = d.expedienteId ?? null;
  if (!expedienteId && d.numeroExpediente) {
    const e = await prisma.expediente.findFirst({
      where: {
        OR: [
          { numeroInterno: d.numeroExpediente },
          { numeroJudicial: d.numeroExpediente },
        ],
      },
    });
    expedienteId = e?.id ?? null;
  }
  if (!expedienteId) throw new Error("expediente no encontrado");

  return prisma.audiencia.create({
    data: {
      expedienteId,
      fechaHora: fecha,
      tipo: d.tipo,
      lugar: d.lugar,
      estado: "programada",
    },
    include: { expediente: { select: { numeroInterno: true } } },
  });
}

const TZ = "America/Mexico_City";

// Rango [00:00, 23:59:59.999] de un día en hora de México, para comparar contra timestamptz.
export function rangoDiaMx(ymd: string) {
  return {
    inicio: new Date(`${ymd}T00:00:00-06:00`),
    fin: new Date(`${ymd}T23:59:59.999-06:00`),
  };
}

export function ymdManana() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: TZ });
}

// Audiencias del día siguiente, con el WhatsApp del abogado responsable:
// es lo que consume el cron de recordatorios de n8n.
export async function audienciasDeManana() {
  const { inicio, fin } = rangoDiaMx(ymdManana());
  const rows = await prisma.audiencia.findMany({
    where: { fechaHora: { gte: inicio, lte: fin }, estado: "programada" },
    orderBy: { fechaHora: "asc" },
    include: {
      expediente: {
        include: {
          cliente: true,
          abogadoResponsable: { select: { nombre: true, telefonoWhatsapp: true } },
        },
      },
    },
  });

  return rows.map((a) => ({
    id: a.id,
    fechaHora: a.fechaHora,
    hora: a.fechaHora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }),
    tipo: a.tipo,
    lugar: a.lugar,
    expediente: a.expediente?.numeroInterno ?? null,
    juzgado: a.expediente?.juzgado ?? null,
    cliente: a.expediente?.cliente?.nombre ?? null,
    abogado: a.expediente?.abogadoResponsable?.nombre ?? null,
    telefonoWhatsapp: a.expediente?.abogadoResponsable?.telefonoWhatsapp ?? null,
  }));
}

export async function audienciasDelDia(fecha: string) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return prisma.audiencia.findMany({
    where: { fechaHora: { gte: inicio, lte: fin }, estado: "programada" },
    orderBy: { fechaHora: "asc" },
    include: { expediente: { include: { cliente: true } } },
  });
}
