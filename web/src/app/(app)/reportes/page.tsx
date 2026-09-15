import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { resumenLlamadasPorAbogado } from "@/lib/services/prospectos";
import { hoyDespacho } from "@/lib/fecha";
import ReportesClient from "./client";

export default async function ReportesPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/inicio");
  }

  const resumen = await resumenLlamadasPorAbogado();
  const hoyLabel = new Date(`${hoyDespacho()}T00:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return <ReportesClient resumen={resumen} hoyLabel={hoyLabel} />;
}
