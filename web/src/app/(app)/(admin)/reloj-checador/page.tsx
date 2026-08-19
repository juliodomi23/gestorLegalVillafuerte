import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { slugSucursal, minutosDesdeMedianoche, minutosDeHora, TOLERANCIA_PUNTUALIDAD_MIN } from "@/lib/checador";
import ChecadorClient, { type ChecadaView, type AbogadoResumen } from "./client";

export default async function RelojChecadorPage({
  searchParams,
}: {
  searchParams: { dias?: string; sucursal?: string };
}) {
  const dias = Math.min(Math.max(Number(searchParams.dias) || 7, 1), 90);
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const [checadasRaw, sucursalesRaw, abogados] = await Promise.all([
    prisma.checada.findMany({
      where: {
        creadoEn: { gte: desde },
        ...(searchParams.sucursal ? { sucursalId: searchParams.sucursal } : {}),
      },
      include: { usuario: { select: { id: true, nombre: true } }, sucursal: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
      take: 500,
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({
      where: { activo: true, ...(searchParams.sucursal ? { sucursalId: searchParams.sucursal } : {}) },
      select: { id: true, nombre: true, sucursal: { select: { nombre: true, horaEntrada: true } } },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const host = headers().get("host") ?? "";
  const origen = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const sucursales = sucursalesRaw.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    urlChecar: `${origen}/checar/${slugSucursal(s.nombre)}`,
    lat: s.lat,
    lon: s.lon,
    radioM: s.radioM,
    horaEntrada: s.horaEntrada,
  }));

  const checadas: ChecadaView[] = checadasRaw.map((c) => ({
    id: c.id,
    abogado: c.usuario.nombre,
    sucursal: c.sucursal.nombre,
    tipo: c.tipo,
    origen: c.origen,
    enSitio: c.enSitio,
    hora: c.creadoEn.toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  // Última checada de cada quien, SIN limitar al rango del filtro — para poder
  // detectar a alguien que no marca desde hace semanas aunque se esté viendo
  // nada más la última semana.
  const ultimasRaw = await prisma.checada.groupBy({
    by: ["usuarioId"],
    _max: { creadoEn: true },
  });
  const ultimaPorUsuario = new Map(ultimasRaw.map((u) => [u.usuarioId, u._max.creadoEn]));

  const resumen: AbogadoResumen[] = abogados.map((a) => {
    const entradasPropias = checadasRaw.filter((c) => c.usuario.id === a.id && c.tipo === "entrada");
    const horaEntrada = a.sucursal?.horaEntrada ?? null;
    let puntual = 0;
    if (horaEntrada) {
      const limite = minutosDeHora(horaEntrada) + TOLERANCIA_PUNTUALIDAD_MIN;
      puntual = entradasPropias.filter((c) => minutosDesdeMedianoche(c.creadoEn) <= limite).length;
    }
    const ultima = ultimaPorUsuario.get(a.id) ?? null;
    return {
      id: a.id,
      nombre: a.nombre,
      sucursal: a.sucursal?.nombre ?? "—",
      horaEntrada,
      entradas: entradasPropias.length,
      puntual: horaEntrada ? puntual : null,
      ultimaChecada: ultima
        ? ultima.toLocaleString("es-MX", {
            timeZone: "America/Mexico_City",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      diasSinChecar: ultima ? Math.floor((Date.now() - ultima.getTime()) / 86_400_000) : null,
    };
  });

  return (
    <ChecadorClient
      checadas={checadas}
      resumen={resumen}
      sucursales={sucursales}
      dias={dias}
      sucursalId={searchParams.sucursal ?? ""}
    />
  );
}
