import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { upsertProspecto, type DatosProspecto } from "@/lib/services/prospectos";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosProspecto>(req, ["nombre"]);
  if ("error" in r) return r.error;
  try {
    const p = await upsertProspecto(r.data);
    return ok(p, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
