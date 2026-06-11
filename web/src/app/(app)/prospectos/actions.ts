"use server";
import { revalidatePath } from "next/cache";
import { actualizarEstadoProspecto, borrarProspecto } from "@/lib/services/prospectos";
import { upsertCliente } from "@/lib/services/resolvers";

export async function actualizarProspectoAction(id: string, estado: string, nota?: string) {
  await actualizarEstadoProspecto(id, estado, nota);
  // Sin revalidatePath: la fila queda en su lugar al cambiar estado.
}

export async function borrarProspectoAction(id: string) {
  await borrarProspecto(id);
  revalidatePath("/prospectos");
}

// Crea o encuentra el cliente en DB, marca el prospecto como convertido, retorna el clienteId.
export async function convertirProspectoAction(id: string, nombre: string, telefono: string) {
  const clienteId = await upsertCliente(nombre, telefono || undefined);
  await actualizarEstadoProspecto(id, "convertido");
  return { clienteId };
}
