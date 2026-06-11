import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse(null, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const [expedientes, prospectos] = await Promise.all([
    prisma.expediente.findMany({
      where: {
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
    })),
    ...prospectos.map((p) => ({
      tipo: "prospecto" as const,
      id: p.id,
      titulo: p.nombre,
      subtitulo: `${p.telefono ?? "Sin tel."} · ${p.ciudad ?? "Sin ciudad"}`,
      href: `/prospectos`,
    })),
  ];

  return NextResponse.json(resultados);
}
