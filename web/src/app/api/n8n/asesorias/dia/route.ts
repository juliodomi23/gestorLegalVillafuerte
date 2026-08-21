import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { asesoriasDelDia } from "@/lib/services/envios";

// Detalle de las asesorías del día, para el resumen de las 9:00 por sucursal.
// El endpoint /asesorias/resumen da los agregados de todo el despacho; este da la lista.
// ?fecha=2026-08-21 &sucursal=Tuxtla
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const url = new URL(req.url);
  const fecha =
    url.searchParams.get("fecha") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const sucursal = url.searchParams.get("sucursal") ?? undefined;
  try {
    const asesorias = await asesoriasDelDia(fecha, sucursal);
    return ok({
      fecha,
      sucursal: sucursal ?? "todas",
      total: asesorias.length,
      pagadas: asesorias.filter((a) => a.pago).length,
      contratos: asesorias.filter((a) => a.status === "contrato_firmado").length,
      asesorias,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
