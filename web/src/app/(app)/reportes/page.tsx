import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { resumenLlamadasPorAbogado, mesActualMX, ANIO_PROSPECTOS } from "@/lib/services/prospectos";
import { resumenCitasMes } from "@/lib/services/citas-reporte";
import { hoyDespacho } from "@/lib/fecha";
import ReportesClient from "./client";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/inicio");
  }

  const mesActual = mesActualMX();
  const mes = searchParams.mes ? parseInt(searchParams.mes) : mesActual;

  const [resumen, citas] = await Promise.all([
    resumenLlamadasPorAbogado(mes, ANIO_PROSPECTOS),
    resumenCitasMes(mes, ANIO_PROSPECTOS),
  ]);
  const hoyLabel = new Date(`${hoyDespacho()}T00:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return <ReportesClient resumen={resumen} citas={citas} hoyLabel={hoyLabel} filtroMes={mes} esMesActual={mes === mesActual} />;
}
