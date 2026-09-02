"use server";

import { revalidatePath } from "next/cache";
import { requireProductividad } from "@/lib/guard";
import { marcarActividad, marcarRespuesta, type Respuesta } from "@/lib/services/productividad";

export type ResultadoMarca = { ok: true } | { ok: false; error: string };

// El motivo viaja de vuelta como dato: en producción Next reemplaza el mensaje de
// cualquier throw de un server action por uno genérico.
export async function marcarActividadAction(
  plantillaId: string,
  fechaISO: string,
  realizada: boolean,
  observaciones?: string
): Promise<ResultadoMarca> {
  try {
    await requireProductividad();
    await marcarActividad(plantillaId, fechaISO, realizada, observaciones);
    revalidatePath("/productividad");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar" };
  }
}

export async function marcarRespuestaAction(
  plantillaId: string,
  fechaISO: string,
  usuarioId: string,
  respuesta: Respuesta
): Promise<ResultadoMarca> {
  try {
    await requireProductividad();
    await marcarRespuesta(plantillaId, fechaISO, usuarioId, respuesta);
    revalidatePath("/productividad");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar" };
  }
}
