import { autorizado, noAutorizado, ok } from "@/lib/api";
import { hoyISO, preguntasPendientesPorTrabajador } from "@/lib/services/productividad";

// Preguntas de Productividad sin contestar de hoy, por trabajador (lo consume el CRON de envío).
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  return ok(await preguntasPendientesPorTrabajador(hoyISO()));
}
