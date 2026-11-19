import { autorizado, noAutorizado, ok } from "@/lib/api";
import { hoyISO, reclamarPreguntasAhora } from "@/lib/services/productividad";
import { TZ_DESPACHO } from "@/lib/fecha";

// Lo llama el CRON cada 10 min: devuelve las preguntas que ya tocan, por destinatario,
// y las deja registradas como enviadas (desde ahí corren sus 20 min para contestar).
export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const hora = new Date().toLocaleTimeString("en-GB", { timeZone: TZ_DESPACHO, hour: "2-digit", minute: "2-digit" });
  return ok(await reclamarPreguntasAhora(hoyISO(), hora));
}
