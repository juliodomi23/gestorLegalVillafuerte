"use server";
import { revalidatePath } from "next/cache";
import { actualizarEstadoProspecto, borrarProspecto } from "@/lib/services/prospectos";

export async function actualizarProspectoAction(id: string, estado: string, nota?: string) {
  await actualizarEstadoProspecto(id, estado, nota);
  revalidatePath("/prospectos");
}

export async function borrarProspectoAction(id: string) {
  await borrarProspecto(id);
  revalidatePath("/prospectos");
}
