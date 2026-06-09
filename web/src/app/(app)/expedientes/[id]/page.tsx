import Link from "next/link";
import { ArrowLeft, Pencil, Plus, AlarmClock } from "lucide-react";
import { Card } from "@/components/ui";
import { ExpedienteTabs } from "@/components/expediente-tabs";

const meta = [
  { k: "Cliente", v: "Juan Pérez" },
  { k: "Rol", v: "Actor" },
  { k: "Cuantía", v: "$250,000", num: true },
  { k: "Etapa procesal", v: "Contestación" },
  { k: "Abogado", v: "Lic. Christian" },
  { k: "Sucursal", v: "Tuxtla" },
  { k: "Inicio", v: "02/06/2026" },
  { k: "Última promoción", v: "07/06/2026" },
];

export default function ExpedienteDetallePage() {
  return (
    <>
      <Link href="/expedientes" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-navy transition-colors mb-4">
        <ArrowLeft size={16} /> Expedientes
      </Link>

      <Card className="overflow-hidden">
        {/* Cabecera */}
        <div className="p-6 border-b border-line">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="exp-no text-[26px] font-semibold text-ink">EXP-2026-0142</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-wash text-success text-[12px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Activo
                </span>
              </div>
              <p className="text-muted text-[14px] mt-1">
                Juicio Ordinario Mercantil · N.º de juicio <span className="exp-no">542/2026</span> · Juzgado 3.º Civil de Tuxtla
              </p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors">
                <Pencil size={18} strokeWidth={1.75} /> Editar
              </button>
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
                <Plus size={18} strokeWidth={1.75} /> Actuación
              </button>
            </div>
          </div>

          {/* Término vigente */}
          <div className="mt-5 rounded-lg border border-danger/30 bg-danger-wash/50 px-4 py-3 flex items-center gap-4">
            <AlarmClock size={18} strokeWidth={1.75} className="text-danger" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-danger">Término vigente: contestar demanda</p>
              <p className="text-[12px] text-muted">
                Acuerdo 03/06 · Notificado por boletín · 9 días · Inicia 05/06 · <b className="text-ink">Vence 10/06/2026</b>
              </p>
            </div>
            <span className="num text-[26px] font-semibold text-danger">
              1<span className="text-[14px] font-sans font-normal"> día</span>
            </span>
          </div>

          {/* Datos */}
          <div className="grid grid-cols-4 gap-y-4 gap-x-8 mt-5">
            {meta.map((m) => (
              <div key={m.k}>
                <p className="eyebrow text-muted">{m.k}</p>
                <p className={`text-[14px] font-bold text-ink mt-1 ${m.num ? "num" : ""}`}>{m.v}</p>
              </div>
            ))}
          </div>
        </div>

        <ExpedienteTabs />
      </Card>
    </>
  );
}
