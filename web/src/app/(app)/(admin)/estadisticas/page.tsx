import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageTitle } from "@/components/ui";
import { BarChart3, FolderOpen, AlarmClock, Banknote, CheckCircle } from "lucide-react";

const ESTADO_LABEL: Record<string, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  concluido: "Concluido",
  archivado: "Archivado",
};

const ESTADO_COLOR: Record<string, { bar: string; badge: string }> = {
  activo:     { bar: "bg-success",      badge: "bg-success-wash text-success"    },
  suspendido: { bar: "bg-amber",        badge: "bg-amber-wash text-amber"        },
  concluido:  { bar: "bg-navy/60",      badge: "bg-navy/10 text-navy"            },
  archivado:  { bar: "bg-line",         badge: "bg-line/60 text-muted"           },
};

function BaraSimple({ valor, max, color }: { valor: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex-1 h-2 rounded-full bg-line/60 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function EstadisticasPage() {
  const session = await getServerSession(authOptions);

  const inicioMes = new Date();
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const [
    expPorEstado,
    expPorMateriaRaw,
    todosExp,
    terminosVencidos,
    terminosPendientes,
    terminosCumplidos,
    cajaMes,
  ] = await Promise.all([
    prisma.expediente.groupBy({ by: ["estado"], _count: { id: true } }),
    prisma.expediente.groupBy({
      by: ["materia"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.expediente.findMany({
      select: { estado: true, abogadoResponsable: { select: { nombre: true } } },
    }),
    prisma.termino.count({ where: { cumplido: false, vencimientoTermino: { lt: hoy } } }),
    prisma.termino.count({ where: { cumplido: false } }),
    prisma.termino.count({ where: { cumplido: true } }),
    prisma.movimientoCaja.groupBy({
      by: ["tipo"],
      _sum: { monto: true },
      where: { fecha: { gte: inicioMes } },
    }),
  ]);

  // ── Agrupación por abogado ───────────────────────────────────────────────────
  const porAbogadoMap = new Map<string, { total: number; activos: number }>();
  for (const exp of todosExp) {
    const nombre = exp.abogadoResponsable?.nombre ?? "Sin asignar";
    const entry = porAbogadoMap.get(nombre) ?? { total: 0, activos: 0 };
    entry.total++;
    if (exp.estado === "activo") entry.activos++;
    porAbogadoMap.set(nombre, entry);
  }
  const porAbogado = Array.from(porAbogadoMap.entries())
    .map(([nombre, s]) => ({ nombre, ...s }))
    .sort((a, b) => b.total - a.total);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalExp = todosExp.length;
  const activosCount = expPorEstado.find((e) => e.estado === "activo")?._count.id ?? 0;
  const ingresosObj = cajaMes.find((m) => m.tipo === "ingreso");
  const ingresosMes = Number(ingresosObj?._sum?.monto ?? 0);

  // ── Materias (top 7, agrupar null como "Sin materia") ───────────────────────
  const expPorMateria = expPorMateriaRaw
    .map((m) => ({ materia: m.materia ?? "Sin materia", count: m._count.id }))
    .slice(0, 7);
  const maxMateria = Math.max(...expPorMateria.map((m) => m.count), 1);

  // ── Estados ─────────────────────────────────────────────────────────────────
  const estadoOrden = ["activo", "suspendido", "concluido", "archivado"];
  const estadoMap = Object.fromEntries(expPorEstado.map((e) => [e.estado, e._count.id]));
  const maxEstado = Math.max(...Object.values(estadoMap), 1);

  // ── Caja mes ────────────────────────────────────────────────────────────────
  const egresosMes = Number(cajaMes.find((m) => m.tipo === "egreso")?._sum?.monto ?? 0);
  const balanceMes = ingresosMes - egresosMes;

  const mesLabel = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });
  const mesCapital = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const kpis = [
    {
      label: "Total expedientes",
      valor: totalExp,
      icon: FolderOpen,
      nota: `${activosCount} activos`,
      color: "text-ink",
    },
    {
      label: "Términos vencidos",
      valor: terminosVencidos,
      icon: AlarmClock,
      nota: terminosVencidos > 0 ? "Requieren atención" : "Al corriente",
      color: terminosVencidos > 0 ? "text-danger" : "text-success",
    },
    {
      label: "Términos pendientes",
      valor: terminosPendientes,
      icon: BarChart3,
      nota: `${terminosCumplidos} cumplidos`,
      color: "text-ink",
    },
    {
      label: `Ingresos ${mesCapital}`,
      valor: `$${ingresosMes.toLocaleString("es-MX")}`,
      icon: Banknote,
      nota: balanceMes >= 0 ? `Balance +$${balanceMes.toLocaleString("es-MX")}` : `Balance -$${Math.abs(balanceMes).toLocaleString("es-MX")}`,
      color: "text-ink",
    },
  ];

  return (
    <>
      <PageTitle eyebrow="Despacho" title="Estadísticas" subtitle="Resumen de actividad y expedientes." />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-surface rounded-xl border border-line shadow-card p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-muted">{k.label}</p>
                <Icon size={18} strokeWidth={1.75} className="text-navy/50" />
              </div>
              <p className={`num text-[38px] font-semibold leading-none mt-3 ${k.color}`}>{k.valor}</p>
              <p className="text-[12px] mt-1.5 text-muted">{k.nota}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Por estado */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Por estado</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            {estadoOrden.map((estado) => {
              const count = estadoMap[estado] ?? 0;
              const c = ESTADO_COLOR[estado] ?? { bar: "bg-line", badge: "bg-line/60 text-muted" };
              return (
                <div key={estado} className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[11.5px] font-bold w-24 text-center shrink-0 ${c.badge}`}>
                    {ESTADO_LABEL[estado]}
                  </span>
                  <BaraSimple valor={count} max={maxEstado} color={c.bar} />
                  <span className="text-[14px] font-semibold text-ink w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Por materia */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Por materia</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            {expPorMateria.length === 0 && (
              <p className="text-muted text-[13.5px]">Sin datos.</p>
            )}
            {expPorMateria.map(({ materia, count }) => (
              <div key={materia} className="flex items-center gap-3">
                <span className="text-[13px] text-ink font-medium w-28 shrink-0 truncate">{materia}</span>
                <BaraSimple valor={count} max={maxMateria} color="bg-navy/60" />
                <span className="text-[14px] font-semibold text-ink w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Por abogado */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Por abogado</h3>
          </div>
          <div className="divide-y divide-line/70">
            {porAbogado.length === 0 && (
              <p className="px-5 py-6 text-muted text-[13.5px]">Sin datos.</p>
            )}
            {porAbogado.map(({ nombre, total, activos }) => (
              <div key={nombre} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-navy/10 text-navy flex items-center justify-center text-[12px] font-bold shrink-0">
                  {nombre.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-ink">{nombre}</p>
                  <p className="text-[12px] text-muted">{activos} activo{activos !== 1 ? "s" : ""}</p>
                </div>
                <span className="num text-[22px] font-semibold text-ink">{total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Términos resumen */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Resumen de términos</h3>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-danger-wash/60 border border-danger/20">
              <div className="flex items-center gap-3">
                <AlarmClock size={20} className="text-danger" strokeWidth={1.75} />
                <div>
                  <p className="text-[14px] font-bold text-danger">Vencidos sin cumplir</p>
                  <p className="text-[12px] text-muted">Requieren acción inmediata</p>
                </div>
              </div>
              <span className="num text-[32px] font-semibold text-danger">{terminosVencidos}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-wash/60 border border-amber/20">
              <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-amber" strokeWidth={1.75} />
                <div>
                  <p className="text-[14px] font-bold text-amber">Pendientes</p>
                  <p className="text-[12px] text-muted">En curso o por vencer</p>
                </div>
              </div>
              <span className="num text-[32px] font-semibold text-amber">{terminosPendientes}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-success-wash/60 border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-success" strokeWidth={1.75} />
                <div>
                  <p className="text-[14px] font-bold text-success">Cumplidos</p>
                  <p className="text-[12px] text-muted">Historial total</p>
                </div>
              </div>
              <span className="num text-[32px] font-semibold text-success">{terminosCumplidos}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
