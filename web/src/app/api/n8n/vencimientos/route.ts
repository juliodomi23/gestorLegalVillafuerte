import { autorizado, noAutorizado, ok } from "@/lib/api";
import { vencimientosProximos } from "@/lib/services/expedientes";

// Términos por vencer en los próximos N días (CRON de alertas). Default 3.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const dias = Number(new URL(req.url).searchParams.get("dias") ?? "3");
  const lista = await vencimientosProximos(Number.isFinite(dias) ? dias : 3);
  return ok(lista);
}
