import { prisma } from "@/lib/prisma";

const ESTADOS = ["pending", "approved", "rejected", "cancelled", "refunded"] as const;
type EstadoPago = (typeof ESTADOS)[number];

export type DatosPago = {
  externalReference: string;
  servicio: string;
  montoBase: number;
  comision?: number;
  estado?: EstadoPago;
  concepto?: string;
  linkPago?: string;
  mpPaymentId?: string;
  mpPreferenceId?: string;
  clienteId?: string;
  citaId?: string;
  asesoriaId?: string;
  fechaPago?: string;
};

function dinero(valor: number, campo: string) {
  if (!Number.isFinite(valor) || valor < 0) throw new Error(`${campo} debe ser un número mayor o igual a cero`);
  return Math.round(valor * 100) / 100;
}

export async function registrarPago(d: DatosPago) {
  const montoBase = dinero(Number(d.montoBase), "montoBase");
  const comision = dinero(Number(d.comision ?? 0), "comision");
  const montoTotal = Math.round((montoBase + comision) * 100) / 100;
  const estado = d.estado ?? "pending";
  if (!ESTADOS.includes(estado)) throw new Error("Estado de pago inválido");
  if (!d.externalReference?.trim()) throw new Error("externalReference es obligatorio");
  if (!d.servicio?.trim()) throw new Error("servicio es obligatorio");

  const fechaPago = estado === "approved"
    ? d.fechaPago ? new Date(d.fechaPago) : new Date()
    : d.fechaPago ? new Date(d.fechaPago) : null;
  if (fechaPago && Number.isNaN(fechaPago.getTime())) throw new Error("fechaPago inválida");

  return prisma.$transaction(async (tx) => {
    const pago = await tx.pago.upsert({
      where: { externalReference: d.externalReference.trim() },
      create: {
        externalReference: d.externalReference.trim(),
        servicio: d.servicio.trim(),
        concepto: d.concepto?.trim() || null,
        montoBase,
        comision,
        montoTotal,
        estado,
        linkPago: d.linkPago || null,
        mpPaymentId: d.mpPaymentId || null,
        mpPreferenceId: d.mpPreferenceId || null,
        clienteId: d.clienteId || null,
        citaId: d.citaId || null,
        asesoriaId: d.asesoriaId || null,
        fechaPago,
      },
      update: {
        servicio: d.servicio.trim(),
        concepto: d.concepto?.trim() || null,
        montoBase,
        comision,
        montoTotal,
        estado,
        ...(d.linkPago !== undefined ? { linkPago: d.linkPago || null } : {}),
        ...(d.mpPaymentId !== undefined ? { mpPaymentId: d.mpPaymentId || null } : {}),
        ...(d.mpPreferenceId !== undefined ? { mpPreferenceId: d.mpPreferenceId || null } : {}),
        ...(d.clienteId !== undefined ? { clienteId: d.clienteId || null } : {}),
        ...(d.citaId !== undefined ? { citaId: d.citaId || null } : {}),
        ...(d.asesoriaId !== undefined ? { asesoriaId: d.asesoriaId || null } : {}),
        ...(fechaPago ? { fechaPago } : {}),
      },
    });

    if (estado === "approved" && pago.citaId) {
      await tx.cita.update({ where: { id: pago.citaId }, data: { estado: "confirmada" } });
    }
    return pago;
  });
}

export async function buscarPago(externalReference: string) {
  return prisma.pago.findUnique({ where: { externalReference } });
}
