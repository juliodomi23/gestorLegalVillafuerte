import { autorizado, fail, leerBody, noAutorizado, ok } from "@/lib/api";
import { buscarPago, registrarPago, type DatosPago } from "@/lib/services/pagos";

export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const referencia = new URL(req.url).searchParams.get("externalReference");
  if (!referencia) return fail("Falta externalReference");
  try {
    const pago = await buscarPago(referencia);
    return pago ? ok(pago) : fail("Pago no encontrado", 404);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

// Se usa tanto al crear la preferencia como al recibir el webhook. El upsert por
// externalReference hace que las notificaciones duplicadas sean idempotentes.
export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosPago>(req, ["externalReference", "servicio", "montoBase"]);
  if ("error" in r) return r.error;
  try {
    return ok(await registrarPago(r.data), 201);
  } catch (e) {
    return fail((e as Error).message, 400);
  }
}
