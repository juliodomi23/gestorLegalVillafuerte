import {
  FolderOpen,
  AlarmClock,
  Gavel,
  CalendarCheck,
  TrendingUp,
  MessageCircle,
  FilePlus,
  MessagesSquare,
  Paperclip,
  Banknote,
} from "lucide-react";

// Datos de ejemplo (luego vendrán de la base de datos vía Prisma)
const kpis = [
  { label: "Expedientes activos", valor: "142", icon: FolderOpen, nota: "+6 este mes", notaColor: "text-success" },
  { label: "Vencimientos / semana", valor: "6", icon: AlarmClock, valorColor: "text-danger", nota: "2 vencen en 48 h" },
  { label: "Audiencias hoy", valor: "3", icon: Gavel, nota: "Próxima 10:00" },
  { label: "Citas hoy", valor: "5", icon: CalendarCheck, nota: "2 por confirmar" },
];

const vencimientos = [
  { t: "Contestar demanda", exp: "EXP-2026-0142", det: "Mercantil · Juan Pérez", chip: "Vence mañana", urg: true },
  { t: "Ofrecer pruebas", exp: "EXP-2026-0098", det: "Civil · Inmobiliaria SA", chip: "2 días", urg: true },
  { t: "Presentar alegatos", exp: "EXP-2026-0051", det: "Familiar · María López", chip: "4 días", urg: false },
];

const audiencias = [
  { hora: "10:00", tipo: "Conciliatoria", det: "EXP-0142 · Juzgado 3.º Civil" },
  { hora: "12:30", tipo: "Desahogo de pruebas", det: "EXP-0077 · Juzgado 1.º Mercantil" },
  { hora: "16:00", tipo: "Alegatos", det: "EXP-0051 · Juzgado Familiar" },
];

const actividad = [
  { icon: FilePlus, txt: "Nuevo expediente EXP-2026-0142 — Juan Pérez (Mercantil)", wa: true, t: "8 min" },
  { icon: MessagesSquare, txt: "Asesoría registrada — despido injustificado", wa: true, t: "40 min" },
  { icon: Paperclip, txt: "Documento subido — Contrato.pdf en EXP-2026-0098", wa: false, t: "1 h" },
  { icon: Banknote, txt: "Corte de caja — Sucursal Centro $4,500", wa: true, t: "2 h" },
];

export default function InicioPage() {
  return (
    <>
      <div className="mb-6">
        <p className="eyebrow text-amber">Martes 9 de junio, 2026</p>
        <h1 className="font-serif text-[30px] text-ink leading-tight mt-1">
          Buenos días, Lic. Christian
        </h1>
        <p className="text-muted text-[14px] mt-0.5">Esto es lo que necesita atención hoy.</p>
      </div>

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
              <p className={`num text-[40px] font-semibold leading-none mt-3 ${k.valorColor ?? "text-ink"}`}>
                {k.valor}
              </p>
              <p className={`text-[12px] mt-1.5 flex items-center gap-1 ${k.notaColor ?? "text-muted"}`}>
                {k.notaColor && <TrendingUp size={14} />} {k.nota}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Vencimientos */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Vencimientos próximos</h3>
          </div>
          {vencimientos.map((v, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-line/70 last:border-0 hover:bg-paper/60 transition-colors"
            >
              <span className={`w-1.5 h-9 rounded-full ${v.urg ? "bg-danger" : "bg-amber-soft"}`} />
              <div className="flex-1">
                <p className="text-[14px] font-bold text-ink">{v.t}</p>
                <p className="text-[12px] text-muted">
                  <span className="exp-no">{v.exp}</span> · {v.det}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold ${
                  v.urg ? "bg-danger-wash text-danger" : "bg-amber-wash text-amber"
                }`}
              >
                {v.chip}
              </span>
            </div>
          ))}
        </div>

        {/* Audiencias */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <h3 className="font-serif text-[17px] text-ink">Audiencias de hoy</h3>
          </div>
          <div className="p-3 space-y-2">
            {audiencias.map((a, i) => (
              <div key={i} className="rounded-lg border border-line p-3 flex gap-3 hover:border-navy/30 transition-colors">
                <div className="num text-navy text-[15px] font-bold w-12">{a.hora}</div>
                <div className="border-l border-line pl-3">
                  <p className="text-[13.5px] font-bold text-ink">{a.tipo}</p>
                  <p className="text-[11.5px] text-muted">{a.det}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividad */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden mt-5">
        <div className="px-5 py-3.5 border-b border-line">
          <h3 className="font-serif text-[17px] text-ink">Actividad reciente</h3>
        </div>
        <div className="divide-y divide-line/70">
          {actividad.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <span className="w-8 h-8 rounded-lg bg-navy/[.08] text-navy flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div className="flex-1 text-[13.5px]">{a.txt}</div>
                {a.wa ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-wash text-success text-[11.5px] font-bold">
                    <MessageCircle size={14} /> WhatsApp
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-line/60 text-muted text-[11.5px] font-bold">Web</span>
                )}
                <span className="text-[12px] text-muted w-16 text-right">{a.t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
