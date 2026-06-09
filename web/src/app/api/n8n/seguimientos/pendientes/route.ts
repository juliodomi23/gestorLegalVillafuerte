import { autorizado, noAutorizado, ok } from "@/lib/api";
import { seguimientosPendientes } from "@/lib/services/seguimientos";

// A quién hay que llamar hoy (lo consume el CRON matutino del bot).
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const pendientes = await seguimientosPendientes();
  return ok(pendientes);
}
