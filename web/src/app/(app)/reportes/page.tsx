import { redirect } from "next/navigation";
import { requireReportes } from "@/lib/guard";
import { resumenLlamadasPorAbogado, mesActualMX, ANIO_PROSPECTOS } from "@/lib/services/prospectos";
import { resumenCitasMes } from "@/lib/services/citas-reporte";
import { resumenMetasMes } from "@/lib/services/metas-reporte";
import { hoyDespacho } from "@/lib/fecha";
import ReportesClient from "./client";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  let esAdmin = false;
  try {
    esAdmin = (await requireReportes()).rol === "admin";
  } catch {
    redirect("/inicio");
  }

  const mesActual = mesActualMX();
  const mes = searchParams.mes ? parseInt(searchParams.mes) : mesActual;

  const [resumen, citas, metas] = await Promise.all([
    resumenLlamadasPorAbogado(mes, ANIO_PROSPECTOS),
    resumenCitasMes(mes, ANIO_PROSPECTOS),
    resumenMetasMes(mes, ANIO_PROSPECTOS),
  ]);
  const hoyLabel = new Date(`${hoyDespacho()}T00:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return <ReportesClient resumen={resumen} citas={citas} metas={metas} esAdmin={esAdmin} hoyLabel={hoyLabel} filtroMes={mes} esMesActual={mes === mesActual} />;
}
