import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { listarProspectosPendientes24h } from "@/lib/services/prospectos";

// Para el CRON de seguimiento del bot de WhatsApp: prospectos con conversationId
// que llevan 24-72h en "por_contactar" sin agendar.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const params = new URL(req.url).searchParams;
    const horas = (nombre: string, defecto: number) => {
      const n = Number(params.get(nombre));
      return Number.isFinite(n) && n > 0 ? n : defecto;
    };
    const data = await listarProspectosPendientes24h(horas("horas_max", 72), horas("horas_min", 24));
    return ok(data);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
