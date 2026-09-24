import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { alcanceDe, porAgenda } from "@/lib/alcance";
import { telefonoVisible } from "@/lib/services/envios";
import { PageTitle } from "@/components/ui";
import TablaSeguimiento, { type FilaSeguimiento } from "../tabla-seguimiento";

const TZ = "America/Mexico_City";
const DIAS = 45;

export default async function NoAsistieronPage() {
  const session = await getServerSession(authOptions);
  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  const citas = await prisma.cita.findMany({
    where: {
      estado: "no_show",
      fechaHora: { gte: new Date(Date.now() - DIAS * 86_400_000) },
      ...porAgenda(alcance),
    },
    include: { cliente: true, abogado: true, sucursal: true },
    orderBy: { fechaHora: "desc" },
    take: 300,
  });

  const filas: FilaSeguimiento[] = citas.map((c) => {
    const nombre = c.cliente?.nombre ?? c.clienteNombre ?? "";
    return {
      id: c.id,
      fecha: c.fechaHora.toLocaleDateString("es-MX", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }),
      cliente: nombre || "—",
      telefono: telefonoVisible(c.cliente?.telefono ?? c.telefono, nombre),
      sucursal: c.sucursal?.nombre ?? "—",
      abogado: c.abogado?.nombre ?? "—",
      seguimientoEstado: c.seguimientoEstado ?? "",
      seguimientoNota: c.seguimientoNota ?? "",
      seguimientoFecha: c.seguimientoFecha?.toISOString().slice(0, 10) ?? "",
    };
  });

  return (
    <>
      <PageTitle
        eyebrow="Asesorías"
        title="No asistieron"
        subtitle={`Citas marcadas “No asistió” en los últimos ${DIAS} días. Llámales para reagendar.`}
      />
      <TablaSeguimiento filas={filas} origen="cita" encabezadoFecha="Cita" vacio="Nadie por ahora." />
    </>
  );
}
