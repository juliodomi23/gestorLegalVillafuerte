"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Phone } from "lucide-react";
import { guardarSeguimientoCitaAction } from "./actions";

export type CitaSeguimientoView = {
  id: string;
  fecha: string; // dd/mm/yyyy de la cita
  cliente: string;
  telefono: string;
  sucursal: string;
  abogado: string;
  estado: "no_show" | "asesorada";
  seguimientoEstado: string;
  seguimientoNota: string;
  seguimientoFecha: string; // yyyy-mm-dd
};

const ESTADOS = [
  { value: "", label: "Por contactar", cls: "bg-amber-wash text-amber" },
  { value: "no_contesto", label: "No contestó", cls: "bg-paper text-muted" },
  { value: "llamar_despues", label: "Llamar después", cls: "bg-blue-50 text-blue-700" },
  { value: "agendo_cita", label: "Agendó cita", cls: "bg-success-wash text-success" },
  { value: "descartado", label: "Descartado", cls: "bg-danger-wash text-danger" },
];

function FilaCita({ c }: { c: CitaSeguimientoView }) {
  const [estado, setEstado] = useState(c.seguimientoEstado);
  const [nota, setNota] = useState(c.seguimientoNota);
  const [fecha, setFecha] = useState(c.seguimientoFecha);
  const [, startTransition] = useTransition();

  function guardar(cambios: Partial<{ estado: string; nota: string; fecha: string }>) {
    const siguiente = { estado, nota, fecha, ...cambios };
    startTransition(() => { guardarSeguimientoCitaAction(c.id, siguiente); });
  }

  return (
    <tr className="hover:bg-paper/40 transition-colors">
      <td className="px-5 py-3 num text-muted whitespace-nowrap">{c.fecha}</td>
      <td className="px-3 py-3">
        <p className="font-bold text-ink">{c.cliente}</p>
        {c.telefono && (
          <p className="text-[11.5px] num text-muted"><Phone size={11} className="inline mr-1" />{c.telefono}</p>
        )}
      </td>
      <td className="px-3 py-3 text-muted">{c.sucursal}</td>
      <td className="px-3 py-3 text-muted">{c.abogado}</td>
      <td className="px-3 py-3">
        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value); guardar({ estado: e.target.value }); }}
          className={`px-2 py-1 rounded text-[11.5px] font-bold border-0 cursor-pointer ${ESTADOS.find((e) => e.value === estado)?.cls}`}
        >
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-3">
        <input
          type="date"
          value={fecha}
          onChange={(e) => { setFecha(e.target.value); guardar({ fecha: e.target.value }); }}
          className="px-2 py-1 rounded border border-line text-[12px] bg-transparent"
        />
      </td>
      <td className="px-3 py-3 min-w-[200px]">
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => { if (nota !== c.seguimientoNota) guardar({ nota }); }}
          placeholder="Nota de la llamada…"
          className="w-full px-2 py-1 rounded bg-surface border border-line focus:border-navy/40 focus:outline-none text-[12.5px] placeholder:text-muted/60"
        />
      </td>
    </tr>
  );
}

function Grupo({ titulo, ayuda, citas }: { titulo: string; ayuda: string; citas: CitaSeguimientoView[] }) {
  const [open, setOpen] = useState(false);
  const porContactar = citas.filter((c) => !c.seguimientoEstado).length;
  return (
    <div className="border border-line rounded-xl overflow-hidden mb-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-5 py-3 bg-paper/60 hover:bg-paper transition-colors text-left">
        {open ? <ChevronDown size={16} className="text-muted shrink-0" /> : <ChevronRight size={16} className="text-muted shrink-0" />}
        <span className="font-serif text-[15px] text-ink flex-1">{titulo}</span>
        <span className="text-[12px] text-muted num">{citas.length} persona{citas.length !== 1 ? "s" : ""}</span>
        {porContactar > 0 && <span className="text-[12px] font-bold text-amber num">{porContactar} por contactar</span>}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <p className="px-5 py-2 text-[12px] text-muted bg-surface border-t border-line">{ayuda}</p>
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-t border-b border-line text-left bg-surface">
                <th className="eyebrow text-muted px-5 py-2.5">Cita</th>
                <th className="eyebrow text-muted px-3 py-2.5">Persona</th>
                <th className="eyebrow text-muted px-3 py-2.5">Sucursal</th>
                <th className="eyebrow text-muted px-3 py-2.5">Abogado</th>
                <th className="eyebrow text-muted px-3 py-2.5">Estado</th>
                <th className="eyebrow text-muted px-3 py-2.5">Fecha llamada</th>
                <th className="eyebrow text-muted px-3 py-2.5">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-surface">
              {citas.map((c) => <FilaCita key={c.id} c={c} />)}
              {citas.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">Nadie por ahora.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SeguimientoCitas({ citas }: { citas: CitaSeguimientoView[] }) {
  return (
    <div className="mt-8">
      <h2 className="font-serif text-[17px] text-ink mb-3">Seguimiento de citas</h2>
      <Grupo
        titulo="No asistieron"
        ayuda="Citas marcadas como “No asistió” (últimos 45 días). Llámales para reagendar."
        citas={citas.filter((c) => c.estado === "no_show")}
      />
      <Grupo
        titulo="Ya asesoraron"
        ayuda="Llegaron a su asesoría y aún no firman contrato (últimos 45 días). Al firmar salen solos de esta lista."
        citas={citas.filter((c) => c.estado === "asesorada")}
      />
    </div>
  );
}
