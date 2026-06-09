import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { resumenDiario } from "@/lib/services/asesorias";

// CRON nocturno: resumen del día para mandar al despacho por WhatsApp.
// ?fecha=2026-06-09 (default: hoy)
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const fecha =
    new URL(req.url).searchParams.get("fecha") ??
    new Date().toISOString().split("T")[0];
  try {
    const resumen = await resumenDiario(fecha);
    return ok(resumen);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
