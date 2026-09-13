import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { marcarAgendoCitaPorConversacion } from "@/lib/services/prospectos";

type Body = { conversationId: string };

// Lo llama agendar_cita_presencial justo tras crear el evento en Calendar, para que
// el prospecto quede marcado "agendo_cita" de inmediato (no hasta el CRON de 24h).
export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<Body>(req, ["conversationId"]);
  if ("error" in r) return r.error;
  try {
    const p = await marcarAgendoCitaPorConversacion(String(r.data.conversationId));
    return ok(p);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
