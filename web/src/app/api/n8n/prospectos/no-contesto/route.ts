import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { listarProspectosNoContesto } from "@/lib/services/prospectos";

// Para el bot externo: prospectos en "no contestó". Tras mandar la plantilla, el
// CRON marca con PATCH /prospectos/[id] estado: "mensaje_automatico" para que la
// siguiente corrida ya no los vuelva a traer.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const data = await listarProspectosNoContesto();
    return ok(data);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
