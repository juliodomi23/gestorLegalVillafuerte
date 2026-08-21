"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { guardarPlanPago, esTipoPlan, type DatosPlan } from "@/lib/services/contratos";

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
