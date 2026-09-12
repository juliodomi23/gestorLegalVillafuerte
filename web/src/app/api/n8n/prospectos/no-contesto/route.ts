import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { listarProspectosNoContestoSinPlantilla } from "@/lib/services/prospectos";

// Para el bot externo: prospectos en "no contestó" que todavía no recibieron la
// plantilla de reintento. Tras mandarla, el CRON marca con PATCH /prospectos/[id]
// (nota += "[plantilla_enviada]") para no volver a mandarla.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const data = await listarProspectosNoContestoSinPlantilla();
    return ok(data);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
