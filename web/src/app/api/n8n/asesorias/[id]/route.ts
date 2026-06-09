import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { actualizarAsesoria, type CambiosAsesoria } from "@/lib/services/asesorias";

// Actualiza status (pendiente→contrato_firmado/no_regreso/descartado) o guarda url del doc Drive.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<CambiosAsesoria>(req);
  if ("error" in r) return r.error;
  try {
    const a = await actualizarAsesoria(params.id, r.data);
    return ok(a);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
