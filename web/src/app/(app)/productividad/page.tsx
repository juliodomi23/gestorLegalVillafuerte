import { redirect } from "next/navigation";
import { requireProductividad } from "@/lib/guard";
import {
  actividadesDelDia,
  resumenSemana,
  trabajadoresActivos,
  hoyISO,
  diaSemanaDe,
  DIAS,
} from "@/lib/services/productividad";
import ProductividadClient from "./client";

export default async function ProductividadPage({
  searchParams,
}: {
  searchParams: { fecha?: string };
}) {
  try {
    await requireProductividad();
  } catch {
    redirect("/inicio");
  }

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha ?? "")
    ? (searchParams.fecha as string)
    : hoyISO();

  const [actividades, semana, trabajadores] = await Promise.all([
    actividadesDelDia(fecha),
    resumenSemana(fecha),
    trabajadoresActivos(),
  ]);

  return (
    <ProductividadClient
      fecha={fecha}
      nombreDia={DIAS[diaSemanaDe(fecha)]}
      esHoy={fecha === hoyISO()}
      actividades={actividades}
      semana={semana}
      trabajadores={trabajadores}
    />
  );
}
