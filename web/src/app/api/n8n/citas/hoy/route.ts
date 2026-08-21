import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { citadosDelDia } from "@/lib/services/envios";

// Citados del día, para el envío de las 8:00 a la Lic. Karen.
// ?fecha=2026-08-21 (default: hoy) &sucursal=Tuxtla (default: todas)
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const url = new URL(req.url);
  const fecha =
    url.searchParams.get("fecha") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const sucursal = url.searchParams.get("sucursal") ?? undefined;
  try {
    const citados = await citadosDelDia(fecha, sucursal);
    return ok({ fecha, sucursal: sucursal ?? "todas", total: citados.length, citados });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
