import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { registrarAsesoria, buscarAsesorias, type DatosAsesoria } from "@/lib/services/asesorias";

// Bot consulta asesorías: ?status=pendiente | ?telefono=961... | ?fecha=2026-06-09 | ?sucursal=Tuxtla
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const p = new URL(req.url).searchParams;
  try {
    const lista = await buscarAsesorias({
      status:   p.get("status")   ?? undefined,
      telefono: p.get("telefono") ?? undefined,
      fecha:    p.get("fecha")    ?? undefined,
      sucursal: p.get("sucursal") ?? undefined,
      limite:   p.get("limite")   ? Number(p.get("limite")) : undefined,
    });
    return ok(lista);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

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
