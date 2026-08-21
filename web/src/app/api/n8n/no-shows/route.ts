import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { noShowsDelDia } from "@/lib/services/envios";

// Quién estaba citado y no dejó rastro de haber venido, para el mensaje de las 20:00.
// "Llegó" = hay una asesoría del día que casa por teléfono o por nombre.
// ?fecha=2026-08-21 (default: hoy)
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const fecha =
    new URL(req.url).searchParams.get("fecha") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  try {
    const noShows = await noShowsDelDia(fecha);
    return ok({ fecha, total: noShows.length, noShows });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
