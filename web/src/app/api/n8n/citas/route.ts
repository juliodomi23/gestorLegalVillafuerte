import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { agendarCita, type DatosCita } from "@/lib/services/citas";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosCita>(req, ["cliente", "fechaHora"]);
  if ("error" in r) return r.error;
  try {
    const c = await agendarCita(r.data);
    return ok(c, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
