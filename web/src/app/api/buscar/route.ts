import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { alcanceDe } from "@/lib/alcance";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse(null, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const alcance = await alcanceDe(session.user?.id, session.user?.rol);

  const [expedientes, prospectos] = await Promise.all([
    prisma.expediente.findMany({
      where: {
        ...(alcance ? { abogadoResponsableId: { in: alcance.abogadoIds } } : {}),
        OR: [
          { cliente: { nombre: { contains: q, mode: "insensitive" } } },
          { numeroInterno: { contains: q, mode: "insensitive" } },
          { numeroJudicial: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { cliente: true },
      take: 5,
      orderBy: { creadoEn: "desc" },
    }),
    prisma.prospecto.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { telefono: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { creadoEn: "desc" },
    }),
  ]);

  const resultados = [
    ...expedientes.map((e) => ({
      tipo: "expediente" as const,
      id: e.id,
      titulo: e.cliente?.nombre ?? "Sin cliente",
      subtitulo: `${e.numeroInterno} · ${e.materia ?? "Sin materia"}`,
      href: `/expedientes/${e.id}`,
      ficha: {
        telefono: e.cliente?.telefono ?? null,
        email: e.cliente?.email ?? null,
        notas: e.cliente?.notas ?? null,
        numeroInterno: e.numeroInterno,
        numeroJudicial: e.numeroJudicial,
        materia: e.materia,
        etapaProcesal: e.etapaProcesal,
      },
    })),
    ...prospectos.map((p) => ({
      tipo: "prospecto" as const,
      id: p.id,
      titulo: p.nombre,
      subtitulo: `${p.telefono ?? "Sin tel."} · ${p.ciudad ?? "Sin ciudad"}`,
      href: `/prospectos`,
      ficha: {
        telefono: p.telefono,
        ciudad: p.ciudad,
        asunto: p.asunto,
        estado: p.estado,
        nota: p.nota,
      },
    })),
  ];

  return NextResponse.json(resultados);
}
