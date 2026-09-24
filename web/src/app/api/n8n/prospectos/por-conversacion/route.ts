import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { nombreDeProspectoPorConversacion } from "@/lib/services/prospectos";

// Lo consultan agendar_cita_presencial y agendar_llamada para contrastar el nombre que la IA
// mandó con el que el cliente dio en el chat (quedó guardado al registrar al prospecto).
// ?conversationId=12094
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) return fail("Falta el parámetro conversationId");
  try {
    return ok({ nombre: await nombreDeProspectoPorConversacion(conversationId) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
