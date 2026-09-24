import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { alcanceDe, porAbogado } from "@/lib/alcance";
import { PageTitle } from "@/components/ui";
import TablaSeguimiento, { type FilaSeguimiento } from "../tabla-seguimiento";

export default async function YaAsesoraronPage() {
  const session = await getServerSession(authOptions);
  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  // Ya llegaron a su asesoría: los "Contrato firmado" salen solos porque solo entra "pendiente".
  const asesorias = await prisma.asesoria.findMany({
    where: { status: "pendiente", ...porAbogado(alcance) },
    include: { sucursal: true, abogado: true },
    orderBy: { fecha: "desc" },
    take: 300,
  });

  const filas: FilaSeguimiento[] = asesorias.map((a) => ({
    id: a.id,
    fecha: a.fecha.toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }),
    cliente: a.nombre ?? "Sin nombre",
    telefono: a.telefono ?? "",
    sucursal: a.sucursal?.nombre ?? "—",
    abogado: a.abogado?.nombre ?? "—",
    seguimientoEstado: a.seguimientoEstado ?? "",
    seguimientoNota: a.seguimiento ?? "",
    seguimientoFecha: a.seguimientoFecha?.toISOString().slice(0, 10) ?? "",
  }));

  return (
    <>
      <PageTitle
        eyebrow="Asesorías"
        title="Ya asesoraron"
        subtitle="Tus asesorados que todavía no firman contrato (cada abogado ve los suyos). Al firmar salen solos de esta lista."
      />
      <TablaSeguimiento filas={filas} origen="asesoria" encabezadoFecha="Asesoría" vacio="Nadie pendiente por ahora." filtrarPor="abogado" />
    </>
  );
}
