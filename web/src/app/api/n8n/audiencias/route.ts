import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { registrarAudiencia, audienciasDelDia, type DatosAudiencia } from "@/lib/services/audiencias";

// Audiencias del día para recordatorios. ?fecha=2026-06-09 (default: hoy)
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const fecha =
    new URL(req.url).searchParams.get("fecha") ??
    new Date().toISOString().split("T")[0];
  try {
    const audiencias = await audienciasDelDia(fecha);
    return ok(audiencias);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosAudiencia>(req, ["fechaHora"]);
  if ("error" in r) return r.error;
  if (!r.data.expedienteId && !r.data.numeroExpediente) {
    return fail("Se requiere expedienteId o numeroExpediente", 400);
  }
  try {
    const a = await registrarAudiencia(r.data);
    return ok(a, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
