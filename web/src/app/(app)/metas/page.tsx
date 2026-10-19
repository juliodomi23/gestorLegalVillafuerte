import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { mesActualMX, ANIO_PROSPECTOS } from "@/lib/services/prospectos";
import { resumenMetasMes } from "@/lib/services/metas-reporte";
import MetasClient from "./client";

export default async function MetasPage({ searchParams }: { searchParams: { mes?: string } }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/inicio");
  }

  const mes = searchParams.mes ? parseInt(searchParams.mes) : mesActualMX();
  const metas = await resumenMetasMes(mes, ANIO_PROSPECTOS);
  return <MetasClient metas={metas} filtroMes={mes} />;
}
