import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { registrarSeguimiento, type DatosSeguimiento } from "@/lib/services/seguimientos";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosSeguimiento>(req, ["cliente", "frecuenciaDias"]);
  if ("error" in r) return r.error;
  try {
    const s = await registrarSeguimiento(r.data);
    return ok(s, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
