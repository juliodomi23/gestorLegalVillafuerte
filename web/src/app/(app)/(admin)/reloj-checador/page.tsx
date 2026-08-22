import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { slugSucursal } from "@/lib/checador";
import { resumenMensual, clasificarChecada } from "@/lib/services/asistencia";
import { hoyDespacho } from "@/lib/fecha";
import ChecadorClient, { type ChecadaView, type AbogadoResumen } from "./client";

export default async function RelojChecadorPage({
  searchParams,
}: {
  searchParams: { dias?: string; sucursal?: string };
}) {
  const dias = Math.min(Math.max(Number(searchParams.dias) || 7, 1), 90);
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const hoy = hoyDespacho();
  const [checadasRaw, sucursalesRaw, abogados, mensual] = await Promise.all([
    prisma.checada.findMany({
      where: {
        creadoEn: { gte: desde },
        ...(searchParams.sucursal ? { sucursalId: searchParams.sucursal } : {}),
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
        sucursal: { select: { nombre: true, horaEntrada: true } },
      },
      orderBy: { creadoEn: "desc" },
      take: 500,
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({
      where: { activo: true, ...(searchParams.sucursal ? { sucursalId: searchParams.sucursal } : {}) },
      select: { id: true, nombre: true, pin: true, sucursal: { select: { nombre: true, horaEntrada: true } } },
      orderBy: { nombre: "asc" },
    }),
    resumenMensual(hoy, searchParams.sucursal || undefined),
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
    // Sólo las entradas se clasifican: una salida no puede ser un retardo.
    clasificacion: c.tipo === "entrada" ? clasificarChecada(c.creadoEn, c.sucursal.horaEntrada) : null,
    justificada: c.justificada,
    motivo: c.motivo,
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

  const porUsuario = new Map(mensual.map((m) => [m.usuarioId, m]));

  const resumen: AbogadoResumen[] = abogados.map((a) => {
    const m = porUsuario.get(a.id);
    const ultima = ultimaPorUsuario.get(a.id) ?? null;
    return {
      id: a.id,
      nombre: a.nombre,
      tienePin: !!a.pin,
      sucursal: a.sucursal?.nombre ?? "—",
      horaEntrada: a.sucursal?.horaEntrada ?? null,
      puntuales: m?.puntuales ?? 0,
      retardosMenores: m?.retardosMenores ?? 0,
      retardosMayores: m?.retardosMayores ?? 0,
      justificados: m?.justificados ?? 0,
      diasDescuento: m?.diasDescuento ?? 0,
      semaforo: m?.semaforo ?? "ok",
      alerta: m?.alerta ?? null,
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
      mes={new Date(`${hoy}T12:00:00-06:00`).toLocaleDateString("es-MX", {
        timeZone: "America/Mexico_City",
        month: "long",
        year: "numeric",
      })}
    />
  );
}
