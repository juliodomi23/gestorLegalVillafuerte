import { prisma } from "@/lib/prisma";
import { hoyDespacho, OFFSET_DESPACHO, TZ_DESPACHO } from "@/lib/fecha";
import { contarCitas, type AsesoriaDelDia, type ConteoCitas, type CitaParaContar } from "@/lib/citas-reporte-regla";

export type ResumenCitasMes = {
  total: ConteoCitas;
  porSucursal: (ConteoCitas & { sucursal: string })[];
};

export async function resumenCitasMes(mes: number, anio: number): Promise<ResumenCitasMes> {
  const ini = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const fin = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;

  const [citas, asesorias] = await Promise.all([
    prisma.cita.findMany({
      where: {
        fechaHora: { gte: new Date(`${ini}T00:00:00${OFFSET_DESPACHO}`), lt: new Date(`${fin}T00:00:00${OFFSET_DESPACHO}`) },
      },
      select: {
        estado: true,
        fechaHora: true,
        clienteNombre: true,
        telefono: true,
        cliente: { select: { nombre: true, telefono: true } },
        sucursal: { select: { nombre: true } },
      },
    }),
    prisma.asesoria.findMany({
      where: { fecha: { gte: new Date(`${ini}T00:00:00.000Z`), lt: new Date(`${fin}T00:00:00.000Z`) } },
      select: { fecha: true, nombre: true, telefono: true },
    }),
  ]);

  const asesoriasPorDia: Record<string, AsesoriaDelDia[]> = {};
  for (const a of asesorias) (asesoriasPorDia[a.fecha.toISOString().slice(0, 10)] ??= []).push(a);

  const porSucursal: Record<string, CitaParaContar[]> = {};
  const todas: CitaParaContar[] = [];
  for (const c of citas) {
    const cita: CitaParaContar = {
      fechaDia: c.fechaHora.toLocaleDateString("en-CA", { timeZone: TZ_DESPACHO }),
      estado: c.estado,
      nombre: c.cliente?.nombre ?? c.clienteNombre ?? "",
      telefono: c.cliente?.telefono ?? c.telefono,
    };
    todas.push(cita);
    (porSucursal[c.sucursal?.nombre ?? "Sin sucursal"] ??= []).push(cita);
  }

  const hoy = hoyDespacho();
  return {
    total: contarCitas(todas, asesoriasPorDia, hoy),
    porSucursal: Object.entries(porSucursal)
      .map(([sucursal, lista]) => ({ sucursal, ...contarCitas(lista, asesoriasPorDia, hoy) }))
      .sort((a, b) => b.agendadas - a.agendadas),
  };
}
