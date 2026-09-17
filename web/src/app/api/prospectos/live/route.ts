import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { alcanceDe } from "@/lib/alcance";
import {
  listarProspectosUnificados,
  resumenLlamadasPorAbogado,
  mapProspectosRows,
  mesActualMX,
  ANIO_PROSPECTOS,
} from "@/lib/services/prospectos";

// Polling en vivo de Prospectos. El refresco de Next (router.refresh(), que usa una
// petición RSC especial con query "_rsc") devuelve 503 de forma consistente en este
// servidor aunque la página normal cargue bien — ver
// gestorlegal-prospectos-live-503 en la memoria del proyecto. Por eso el cliente
// hace polling contra este endpoint normal (mismo patrón que /api/alertas para la
// campana del topbar) en vez de depender de esa ruta interna de Next.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") ? parseInt(searchParams.get("mes")!) : mesActualMX();

  const alcance = await alcanceDe(session.user.id, session.user.rol);
  const [rows, resumen] = await Promise.all([
    listarProspectosUnificados(
      {
        ciudad: searchParams.get("ciudad") || undefined,
        estado: searchParams.get("estado") || undefined,
        abogadoId: searchParams.get("abogado") || undefined,
        mes,
        anio: ANIO_PROSPECTOS,
      },
      alcance,
    ),
    resumenLlamadasPorAbogado(),
  ]);

  const miResumen = resumen.find((r) => r.abogadoId === session.user.id) ?? null;
  return Response.json({ prospectos: mapProspectosRows(rows), miResumen, resumen });
}
