"use server";
import { revalidatePath } from "next/cache";
import { actualizarEstadoProspecto, borrarProspecto } from "@/lib/services/prospectos";

export async function actualizarProspectoAction(id: string, estado: string, nota?: string) {
  await actualizarEstadoProspecto(id, estado, nota);
  // Sin revalidatePath: la fila queda en su lugar al cambiar estado.
}

export async function borrarProspectoAction(id: string) {
  await borrarProspecto(id);
  revalidatePath("/prospectos");
}
