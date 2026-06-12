import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ArrowLeft, FolderOpen, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

export default async function ClienteDetallePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";
  const userId = session?.user?.id;

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.id },
    include: {
      abogado: true,
      expedientes: {
        // Un abogado solo ve los expedientes suyos, aunque el cliente tenga más.
        where: esAdmin ? undefined : { abogadoResponsableId: userId },
        include: { abogadoResponsable: true, sucursal: true },
        orderBy: { creadoEn: "desc" },
      },
      asesorias: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
    },
  });

  if (!cliente) notFound();

  // Cliente privado: solo su abogado dueño (o el admin) puede abrirlo por URL.
  if (!esAdmin && cliente.abogadoId !== userId) notFound();

  const meta = [
    { k: "Tipo",            v: cliente.tipo === "moral" ? "Persona moral" : "Persona física" },
    { k: "Abogado",         v: cliente.abogado?.nombre ? `Lic. ${cliente.abogado.nombre}` : "—" },
    { k: "Cliente desde",   v: fmtDate(cliente.creadoEn) },
    { k: "Última asesoría", v: fmtDate(cliente.asesorias[0]?.fecha ?? null) },
  ];

  return (
    <>
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-navy transition-colors mb-4">
        <ArrowLeft size={16} /> Clientes
      </Link>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-line">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-[24px] text-ink leading-tight">{cliente.nombre}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[13.5px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={15} strokeWidth={1.75} />
                  {cliente.telefono ? <span className="num">{cliente.telefono}</span> : "Sin teléfono"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={15} strokeWidth={1.75} />
                  {cliente.email || "Sin email"}
                </span>
              </div>
              {cliente.notas && <p className="text-[13px] text-muted mt-2">{cliente.notas}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 mt-5">
            {meta.map((m) => (
              <div key={m.k}>
                <p className="eyebrow text-muted">{m.k}</p>
                <p className="text-[14px] font-bold text-ink mt-1">{m.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <p className="eyebrow text-muted mb-3 flex items-center gap-2">
            <FolderOpen size={15} strokeWidth={1.75} />
            Expedientes ({cliente.expedientes.length})
          </p>

          {cliente.expedientes.length === 0 ? (
            <p className="text-[13.5px] text-muted py-4">Este cliente aún no tiene expedientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="eyebrow text-muted px-3 py-2.5">Número</th>
                    <th className="eyebrow text-muted px-3 py-2.5">N.º judicial</th>
                    <th className="eyebrow text-muted px-3 py-2.5">Materia</th>
                    <th className="eyebrow text-muted px-3 py-2.5">Etapa</th>
                    <th className="eyebrow text-muted px-3 py-2.5">Abogado</th>
                    <th className="eyebrow text-muted px-3 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {cliente.expedientes.map((e) => (
                    <tr key={e.id} className="hover:bg-paper/60 transition-colors">
                      <td className="px-3 py-3">
                        <Link href={`/expedientes/${e.id}`} className="exp-no font-bold text-navy hover:underline">
                          {e.numeroInterno ?? "S/N"}
                        </Link>
                      </td>
                      <td className="px-3 py-3 num text-muted">{e.numeroJudicial ?? "—"}</td>
                      <td className="px-3 py-3">{e.materia ?? "—"}</td>
                      <td className="px-3 py-3">{e.etapaProcesal ?? "—"}</td>
                      <td className="px-3 py-3 text-muted">{e.abogadoResponsable?.nombre ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-line/60 text-muted">
                          {e.estado.charAt(0).toUpperCase() + e.estado.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
