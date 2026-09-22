import { autorizado, noAutorizado, ok, fail } from "@/lib/api";
import { resumenLlamadasPorAbogado } from "@/lib/services/prospectos";

// Reporte de llamadas del día para el CRON de las 19:00 (bot interno → Lic. Christian):
// quién llamó cuántos prospectos, cuántos agendaron cita y cuántos firmaron contrato hoy.
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const resumen = await resumenLlamadasPorAbogado();
    const porAbogado = resumen
      .filter((r) => r.llamadasHoy > 0 || r.agendadasHoy > 0 || r.contratosHoy > 0)
      .map((r) => ({
        abogado: r.nombre,
        llamadas: r.llamadasHoy,
        agendaron: r.agendadasHoy,
        contratos: r.contratosHoy,
      }));
    return ok({
      totalLlamadas: porAbogado.reduce((s, r) => s + r.llamadas, 0),
      totalAgendaron: porAbogado.reduce((s, r) => s + r.agendaron, 0),
      totalContratos: porAbogado.reduce((s, r) => s + r.contratos, 0),
      porAbogado,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
