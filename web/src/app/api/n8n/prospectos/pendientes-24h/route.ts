import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { listarProspectosPendientes24h } from "@/lib/services/prospectos";

// Para el CRON de seguimiento del bot de WhatsApp: prospectos con conversationId
// que llevan 24-72h en "por_contactar" sin agendar.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const data = await listarProspectosPendientes24h();
    return ok(data);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
