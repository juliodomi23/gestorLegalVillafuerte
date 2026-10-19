"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import { guardarMeta } from "@/lib/services/metas-reporte";

export async function guardarMetaAction(sucursalId: string, contratos: number, asesorias: number) {
  await requireAdmin();
  const entero = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  await guardarMeta(sucursalId, { contratos: entero(contratos), asesorias: entero(asesorias) });
  revalidatePath("/metas");
}
