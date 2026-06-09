import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { marcarLlamada } from "@/lib/services/seguimientos";

// El abogado confirma que llamó → avanza el próximo llamado.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const s = await marcarLlamada(params.id);
    return ok(s);
  } catch (e) {
    return fail((e as Error).message, 404);
  }
}
