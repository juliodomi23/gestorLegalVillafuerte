import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { crearExpediente, obtenerExpedientePorNumero, type DatosExpediente } from "@/lib/services/expedientes";

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosExpediente>(req, ["cliente"]);
  if ("error" in r) return r.error;
  try {
    const exp = await crearExpediente(r.data);
    return ok(exp, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const numero = new URL(req.url).searchParams.get("numero");
  if (!numero) return fail("Falta el parámetro ?numero");
  const exp = await obtenerExpedientePorNumero(numero);
  if (!exp) return fail("Expediente no encontrado", 404);
  return ok(exp);
}
