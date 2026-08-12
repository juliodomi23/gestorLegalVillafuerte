import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { audienciasDeManana } from "@/lib/services/audiencias";

// Audiencias del día siguiente para el recordatorio "un día antes".
// n8n lo llama con un cron diario y manda WhatsApp a `telefonoWhatsapp`.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  try {
    return ok(await audienciasDeManana());
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
