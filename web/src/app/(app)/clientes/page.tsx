import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClientesClient, { type ClienteView } from "./client";
import { alcanceDe, porAbogado } from "@/lib/alcance";

export default async function ClientesPage() {
  const session = await getServerSession(authOptions);
  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  const rows = await prisma.cliente.findMany({
    where: porAbogado(alcance),
    include: {
      _count: { select: { expedientes: true } },
      asesorias: { orderBy: { creadoEn: "desc" }, take: 1, select: { fecha: true } },
    },
    orderBy: { nombre: "asc" },
    take: 300, // ponytail: tope simple en vez de paginación; subir o paginar de verdad si el despacho pasa de esto
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
