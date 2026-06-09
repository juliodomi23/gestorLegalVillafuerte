import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FolderOpen, AlarmClock, Gavel, CalendarCheck, TrendingUp, MessageCircle,
  FilePlus, MessagesSquare, Banknote,
} from "lucide-react";

function fmtDias(dias: number) {
  if (dias < 0) return "Vencido";
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `${dias} días`;
}

export default async function InicioPage() {
  const session = await getServerSession(authOptions);
  const nombre = session?.user?.name ?? "Lic.";
  const esAdmin = session?.user?.rol === "admin";
  const userId = session?.user?.id;

  const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin    = new Date(); hoyFin.setHours(23, 59, 59, 999);
  const semanaFin = new Date(); semanaFin.setDate(semanaFin.getDate() + 7); semanaFin.setHours(23, 59, 59, 999);

  const expWhere = esAdmin ? { estado: "activo" as const } : { estado: "activo" as const, abogadoResponsableId: userId };
  const expFilter = esAdmin ? {} : { expediente: { abogadoResponsableId: userId } };

  const [expActivos, terminosSemana, audienciasHoy, citasHoy, actividadRows] = await Promise.all([
    prisma.expediente.count({ where: expWhere }),
    prisma.termino.findMany({
      where: {
        cumplido: false,
        vencimientoTermino: { gte: hoyInicio, lte: semanaFin },
        ...expFilter,
      },
      include: { expediente: { include: { cliente: true } } },
      orderBy: { vencimientoTermino: "asc" },
      take: 5,
    }),
    prisma.audiencia.count({
      where: {
        fechaHora: { gte: hoyInicio, lte: hoyFin },
        estado: "programada",
        ...expFilter,
      },
    }),
    prisma.cita.count({
      where: {
        fechaHora: { gte: hoyInicio, lte: hoyFin },
        estado: { not: "cancelada" },
        ...(esAdmin ? {} : { abogadoId: userId }),
      },
    }),
    prisma.actuacion.findMany({
      where: esAdmin ? undefined : expFilter,
      include: { expediente: { select: { numeroInterno: true } } },
      orderBy: { creadoEn: "desc" },
      take: 5,
    }),
  ]);

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const urgentes = terminosSemana.filter((t) => {
    const dias = Math.round((t.vencimientoTermino!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return dias <= 2;
  }).length;

  const kpis = [
    { label: "Expedientes activos",    valor: String(expActivos),        icon: FolderOpen,    nota: "Total activos",              notaColor: undefined    },
    { label: "Vencimientos / semana",  valor: String(terminosSemana.length), icon: AlarmClock, valorColor: terminosSemana.length > 0 ? "text-danger" : undefined, nota: urgentes > 0 ? `${urgentes} vencen en 48 h` : "Sin urgentes", notaColor: urgentes > 0 ? "text-danger" : undefined },
    { label: "Audiencias hoy",         valor: String(audienciasHoy),     icon: Gavel,         nota: "Programadas hoy",            notaColor: undefined    },
    { label: "Citas hoy",              valor: String(citasHoy),          icon: CalendarCheck, nota: "Agendadas para hoy",         notaColor: undefined    },
  ];

  const hoyLabel = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hoyCapitalized = hoyLabel.charAt(0).toUpperCase() + hoyLabel.slice(1);

  return (
    <>
      <div className="mb-6">
        <p className="eyebrow text-amber">{hoyCapitalized}</p>
        <h1 className="font-serif text-[30px] text-ink leading-tight mt-1">Buenos días, {nombre}</h1>
        <p className="text-muted text-[14px] mt-0.5">Esto es lo que necesita atención hoy.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-surface rounded-xl border border-line shadow-card p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-muted">{k.label}</p>
                <Icon size={18} strokeWidth={1.75} className="text-navy/50" />
              </div>
              <p className={`num text-[40px] font-semibold leading-none mt-3 ${k.valorColor ?? "text-ink"}`}>{k.valor}</p>
              <p className={`text-[12px] mt-1.5 flex items-center gap-1 ${k.notaColor ?? "text-muted"}`}>
                {k.notaColor && <TrendingUp size={14} />} {k.nota}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Vencimientos próximos</h3>
          </div>
          {terminosSemana.length === 0 && (
            <p className="px-5 py-6 text-muted text-[13.5px]">No hay vencimientos esta semana.</p>
          )}
          {terminosSemana.map((t) => {
            const dias = Math.round((t.vencimientoTermino!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            const urg = dias <= 2;
            return (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-line/70 last:border-0 hover:bg-paper/60 transition-colors">
                <span className={`w-1.5 h-9 rounded-full ${urg ? "bg-danger" : "bg-amber-soft"}`} />
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-ink">{t.descripcion ?? "Término"}</p>
                  <p className="text-[12px] text-muted">
                    <span className="exp-no">{t.expediente.numeroInterno ?? "S/N"}</span>
                    {t.expediente.cliente?.nombre ? ` · ${t.expediente.cliente.nombre}` : ""}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold ${urg ? "bg-danger-wash text-danger" : "bg-amber-wash text-amber"}`}>
                  {fmtDias(dias)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Actividad reciente</h3>
          </div>
          <div className="divide-y divide-line/70">
            {actividadRows.length === 0 && <p className="px-5 py-6 text-muted text-[13.5px]">Sin actividad reciente.</p>}
            {actividadRows.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-8 h-8 rounded-lg bg-navy/[.08] text-navy flex items-center justify-center">
                  {a.origen === "whatsapp" ? <MessagesSquare size={18} strokeWidth={1.75} /> : <FilePlus size={18} strokeWidth={1.75} />}
                </span>
                <div className="flex-1 text-[13.5px]">
                  {a.tipo ?? "Actuación"} — {a.expediente.numeroInterno ?? "S/N"}
                  {a.descripcion ? ` · ${a.descripcion.slice(0, 40)}` : ""}
                </div>
                {a.origen === "whatsapp" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-wash text-success text-[11.5px] font-bold">
                    <MessageCircle size={14} /> WhatsApp
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-line/60 text-muted text-[11.5px] font-bold">Web</span>
                )}
              </div>
            ))}
          </div>
          {actividadRows.some((a) => a.origen === "whatsapp") && (
            <div className="px-5 py-3 border-t border-line/60">
              <p className="text-[12px] text-muted flex items-center gap-1.5">
                <Banknote size={13} className="text-navy" /> Los cortes de caja y actuaciones del bot aparecen aquí en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
