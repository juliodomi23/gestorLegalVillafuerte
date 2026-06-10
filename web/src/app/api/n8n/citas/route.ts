import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { agendarCita, citasDelDia, type DatosCita } from "@/lib/services/citas";

// CRON matutino: citas del día para mandar recordatorios. ?fecha=2026-06-09 (default: hoy)
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const fecha =
    new URL(req.url).searchParams.get("fecha") ??
    new Date().toISOString().split("T")[0];
  try {
    const citas = await citasDelDia(fecha);
    return ok(citas);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<DatosCita>(req, ["cliente", "fechaHora"]);
  if ("error" in r) return r.error;
  try {
    // Normalizar googleEventId: "null" (string) o "" → undefined para que el dedup funcione
    const datos = {
      ...r.data,
      googleEventId: r.data.googleEventId && r.data.googleEventId !== "null"
        ? r.data.googleEventId
        : undefined,
    };
    const c = await agendarCita(datos);
    return ok(c, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
