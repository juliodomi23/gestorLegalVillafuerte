"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import {
  guardarPlanPago,
  esTipoPlan,
  guardarRevisionContrato,
  guardarProrrogaContrato,
  esEstadoRevision,
  type DatosPlan,
} from "@/lib/services/contratos";

export type ResultadoPlan =
  | { ok: true; eventoCreado: boolean }
  | { ok: false; error: string };

// Un expediente es privado: solo su abogado responsable o un admin lo tocan.
async function puedeTocar(expedienteId: string, userId: string, rol: string) {
  if (rol === "admin") return true;
  const e = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    select: { abogadoResponsableId: true },
  });
  return !!e && e.abogadoResponsableId === userId;
}

export async function guardarPlanAction(form: {
  expedienteId: string;
  tipo: string;
  montoTotal: string;
  montoInicial: string;
  montoPeriodico: string;
  fechaProxPago: string;
  notas: string;
}): Promise<ResultadoPlan> {
  try {
    const sesion = await requireSession();
    if (!(await puedeTocar(form.expedienteId, sesion.id, sesion.rol))) {
      return { ok: false, error: "No tienes permiso sobre este expediente" };
    }
    if (!esTipoPlan(form.tipo)) return { ok: false, error: "Elige el tipo de plan de pago" };

    const numero = (v: string) => {
      const n = Number(String(v).replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const montoTotal = numero(form.montoTotal);
    if (!montoTotal) return { ok: false, error: "El monto total debe ser un número mayor a cero" };

    const datos: DatosPlan = {
      expedienteId: form.expedienteId,
      tipo: form.tipo,
      montoTotal,
      montoInicial: numero(form.montoInicial),
      montoPeriodico: numero(form.montoPeriodico),
      fechaProxPago: form.fechaProxPago || null,
      notas: form.notas || null,
    };
    const r = await guardarPlanPago(datos);
    revalidatePath("/contratos");
    return { ok: true, eventoCreado: r.eventoCreado };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el plan" };
  }
}

// Prórroga de pago: solo el admin la captura.
export async function guardarProrrogaAction(documentoId: string, fecha: string): Promise<ResultadoRevision> {
  try {
    await requireAdmin();
    await guardarProrrogaContrato(documentoId, fecha || null);
    revalidatePath("/contratos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar la prórroga" };
  }
}

export type ResultadoRevision = { ok: true } | { ok: false; error: string };

// Checklist de revisión: solo el admin (el Lic.) lo puede marcar.
export async function guardarRevisionAction(
  documentoId: string,
  estado: string,
  notas: string
): Promise<ResultadoRevision> {
  try {
    await requireAdmin();
    if (!esEstadoRevision(estado)) return { ok: false, error: "Estado de revisión inválido" };
    await guardarRevisionContrato(documentoId, estado, notas.trim() || null);
    revalidatePath("/contratos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar la revisión" };
  }
}
