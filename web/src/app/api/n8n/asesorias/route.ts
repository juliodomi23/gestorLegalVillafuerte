import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { registrarAsesoria, type DatosAsesoria } from "@/lib/services/asesorias";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosAsesoria>(req, ["nombre"]);
  if ("error" in r) return r.error;
  try {
    const a = await registrarAsesoria(r.data);
    return ok(a, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
