import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { registrarMovimiento, type DatosMovimiento } from "@/lib/services/caja";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosMovimiento>(req, ["tipo", "monto"]);
  if ("error" in r) return r.error;
  try {
    const m = await registrarMovimiento(r.data);
    return ok(m, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
