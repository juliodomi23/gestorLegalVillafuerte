import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { registrarTermino, type DatosTerminoStandalone } from "@/lib/services/terminos";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosTerminoStandalone>(req, ["numeroExpediente"]);
  if ("error" in r) return r.error;
  try {
    const t = await registrarTermino(r.data);
    return ok(t, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
