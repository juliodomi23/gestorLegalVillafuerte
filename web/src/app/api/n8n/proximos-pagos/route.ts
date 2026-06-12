import { autorizado, noAutorizado, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();

  const dias = Number(new URL(req.url).searchParams.get("dias") ?? "3");
  const limite = Number.isFinite(dias) && dias > 0 ? dias : 3;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + limite);

  const planes = await prisma.planPago.findMany({
    where: {
      fechaProxPago: { gte: hoy, lte: hasta },
    },
    include: {
      expediente: {
        select: {
          numeroInterno: true,
          cliente: { select: { nombre: true } },
        },
      },
    },
    orderBy: { fechaProxPago: "asc" },
  });

  const data = planes.map((p) => ({
    expediente: p.expediente?.numeroInterno ?? "—",
    cliente: p.expediente?.cliente?.nombre ?? "—",
    tipo: p.tipo,
    montoTotal: Number(p.montoTotal),
    montoPeriodico: p.montoPeriodico ? Number(p.montoPeriodico) : null,
    montoFinal: p.montoFinal ? Number(p.montoFinal) : null,
    fechaProxPago: p.fechaProxPago?.toISOString().split("T")[0] ?? null,
    notas: p.notas ?? null,
  }));

  return ok(data);
}
