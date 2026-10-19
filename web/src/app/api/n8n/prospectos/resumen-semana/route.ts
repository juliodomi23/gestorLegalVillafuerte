import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { resumenLlamadasPorAbogado } from "@/lib/services/prospectos";
import { lunesDe } from "@/lib/services/productividad";
import { hoyDespacho } from "@/lib/fecha";

// Igual que resumen-dia pero con la semana en curso (lunes a hoy), para el CRON del domingo.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const resumen = await resumenLlamadasPorAbogado();
    const porAbogado = resumen
      .filter((r) => r.llamadasSemana > 0 || r.agendadasSemana > 0 || r.contratosSemana > 0)
      .map((r) => ({
        abogado: r.nombre,
        llamadas: r.llamadasSemana,
        agendaron: r.agendadasSemana,
        contratos: r.contratosSemana,
      }))
      .sort((a, b) => b.llamadas - a.llamadas);
    const hasta = hoyDespacho();
    return ok({
      desde: lunesDe(hasta),
      hasta,
      totalLlamadas: porAbogado.reduce((s, r) => s + r.llamadas, 0),
      totalAgendaron: porAbogado.reduce((s, r) => s + r.agendaron, 0),
      totalContratos: porAbogado.reduce((s, r) => s + r.contratos, 0),
      porAbogado,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
