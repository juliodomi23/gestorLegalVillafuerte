import { autorizado, noAutorizado, ok, fail, leerBodyValidado } from "@/lib/api";
import { registrarMovimiento, type DatosMovimiento } from "@/lib/services/caja";
import { movimientoN8nSchema } from "@/lib/validaciones";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBodyValidado<DatosMovimiento>(req, movimientoN8nSchema);
  if ("error" in r) return r.error;
  try {
    const m = await registrarMovimiento(r.data);
    return ok(m, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
