import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { listarProspectosPorLlamar } from "@/lib/services/prospectos";

// Para el workflow de llamadas del agente de voz. ?limite=1 (por defecto) y ?dias=5.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const q = new URL(req.url).searchParams;
  const limite = Math.min(Math.max(parseInt(q.get("limite") ?? "1") || 1, 1), 5);
  const dias = Math.min(Math.max(parseInt(q.get("dias") ?? "5") || 5, 1), 30);
  try {
    return ok(await listarProspectosPorLlamar(limite, dias));
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
