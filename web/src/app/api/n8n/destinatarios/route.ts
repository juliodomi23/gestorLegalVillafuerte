import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { destinatarios } from "@/lib/services/envios";

// A quién le toca cada envío automático. Sale de Configuración › Usuarios, así que
// cambiar destinatarios no requiere tocar los workflows ni desplegar.
// ?tipo=sucursal | todas (sin tipo: los dos)
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const tipo = new URL(req.url).searchParams.get("tipo");
  if (tipo && tipo !== "sucursal" && tipo !== "todas") {
    return fail("tipo debe ser 'sucursal' o 'todas'");
  }
  try {
    const lista = await destinatarios((tipo as "sucursal" | "todas") ?? undefined);
    return ok({ total: lista.length, destinatarios: lista });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
