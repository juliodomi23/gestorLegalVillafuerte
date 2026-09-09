import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { actualizarEstadoProspecto } from "@/lib/services/prospectos";

type CambiosProspecto = { estado: string; nota?: string };

// Marca el prospecto tras el CRON de seguimiento 24h (agendo_cita si ya reservó,
// llamar_despues si se le mandó el mensaje de seguimiento).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<CambiosProspecto>(req, ["estado"]);
  if ("error" in r) return r.error;
  try {
    const p = await actualizarEstadoProspecto(params.id, r.data.estado, r.data.nota);
    return ok(p);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
