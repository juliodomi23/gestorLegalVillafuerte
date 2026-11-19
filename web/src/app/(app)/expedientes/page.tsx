import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExpedientesClient, { type ExpView } from "./client";
import type { ClienteBasico } from "./client";
import Link from "next/link";
import { alcanceDe, porCliente, porExpediente, porVista } from "@/lib/alcance";
import { soloPropios } from "@/lib/alcance-regla";

function textoVence(fecha: Date | null): { texto: string; urgente: boolean } | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { texto: "Vencido", urgente: true };
  if (dias === 0) return { texto: "Hoy", urgente: true };
  if (dias === 1) return { texto: "Mañana", urgente: true };
  return { texto: `${dias} días`, urgente: dias <= 3 };
}

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams?: { nuevo?: string; nombre?: string; clienteId?: string; vista?: string };
}) {
  const session = await getServerSession(authOptions);

  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);
  const userId = session?.user?.id;
  const alcancePropio = alcance && soloPropios(userId, alcance);
  const tienePestanas = !!alcancePropio && !!userId && alcancePropio.abogadoIds.some((id) => id !== userId);
  const vista = tienePestanas && searchParams?.vista === "equipo" ? "equipo" : "mios";
  const dondeExpedientes = tienePestanas ? porVista(alcancePropio, userId, vista) : porExpediente(alcancePropio, userId);
  const [totalMios, totalEquipo] = tienePestanas
    ? await Promise.all([
        prisma.expediente.count({ where: porVista(alcancePropio, userId, "mios") }),
        prisma.expediente.count({ where: porVista(alcancePropio, userId, "equipo") }),
      ])
    : [0, 0];

  const [rows, sucursalesDb, abogadosDb, clientesDb] = await Promise.all([
    prisma.expediente.findMany({
      where: dondeExpedientes,
      include: {
        cliente: true,
        abogadoResponsable: true,
        sucursal: true,
        terminos: { orderBy: { vencimientoTermino: "asc" }, take: 1 },
      },
      orderBy: { creadoEn: "desc" },
      take: 300, // ponytail: tope simple en vez de paginación; subir o paginar de verdad si el despacho pasa de esto
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.cliente.findMany({
      where: porCliente(alcance),
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, telefono: true },
    }),
  ]);

  const expedientes: ExpView[] = rows.map((e) => {
    const proximoVencimiento =
      e.terminos.find((t) => !t.cumplido && t.vencimientoTermino)?.vencimientoTermino ?? null;
    const vence = textoVence(proximoVencimiento);
    return {
      id: e.id,
      clienteId: e.clienteId ?? null,
      numeroInterno: e.numeroInterno ?? "S/N",
      numeroJudicial: e.numeroJudicial ?? "—",
      cliente: e.cliente?.nombre ?? "—",
      materia: e.materia ?? "—",
      etapa: e.etapaProcesal ?? "—",
      abogado: e.abogadoResponsable?.nombre ?? "—",
      sucursal: e.sucursal?.nombre ?? "—",
      estado: e.estado.charAt(0).toUpperCase() + e.estado.slice(1),
      vencimiento: vence?.texto ?? null,
      urgente: vence?.urgente ?? false,
    };
  });

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);
  const clientes: ClienteBasico[] = clientesDb.map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono ?? undefined }));

  const pestana = (id: "mios" | "equipo", texto: string, total: number) => (
    <Link
      href={`/expedientes?vista=${id}`}
      className={`px-4 py-2 text-[13px] font-semibold border-b-2 ${vista === id ? "border-navy text-navy" : "border-transparent text-muted hover:text-navy"}`}
    >
      {texto} ({total})
    </Link>
  );

  return (
    <>
    {tienePestanas && (
      <div className="flex gap-2 mb-4 border-b border-line">
        {pestana("mios", "Míos", totalMios)}
        {pestana("equipo", "Mi equipo", totalEquipo)}
      </div>
    )}
    <ExpedientesClient
      expedientes={expedientes}
      sucursales={sucursales}
      abogados={abogados}
      clientes={clientes}
      sesionRol={session?.user?.rol ?? "abogado"}
      sesionNombre={session?.user?.name ?? ""}
      preNombre={searchParams?.nuevo === "1" ? (searchParams.nombre ?? "") : ""}
      preClienteId={searchParams?.nuevo === "1" ? (searchParams.clienteId ?? "") : ""}
    />
    </>
  );
}
