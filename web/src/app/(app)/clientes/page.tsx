import { prisma } from "@/lib/prisma";
import ClientesClient, { type ClienteView } from "./client";

export default async function ClientesPage() {
  const rows = await prisma.cliente.findMany({
    include: {
      _count: { select: { expedientes: true } },
      asesorias: { orderBy: { creadoEn: "desc" }, take: 1, select: { fecha: true } },
    },
    orderBy: { nombre: "asc" },
  });

  const clientes: ClienteView[] = rows.map((c) => {
    const lastFecha = c.asesorias[0]?.fecha ?? null;
    let ultimaAsesoria: string | null = null;
    if (lastFecha) {
      const d = lastFecha instanceof Date ? lastFecha : new Date(lastFecha);
      ultimaAsesoria = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    }
    return {
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo === "moral" ? "Moral" : "Física",
      telefono: c.telefono ?? "—",
      email: c.email ?? "",
      expedientes: c._count.expedientes,
      ultimaAsesoria,
    };
  });

  return <ClientesClient clientes={clientes} />;
}
