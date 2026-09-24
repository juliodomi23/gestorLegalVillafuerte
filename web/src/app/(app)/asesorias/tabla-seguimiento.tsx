"use client";

import { useState, useTransition } from "react";
import { Phone } from "lucide-react";
import { Card } from "@/components/ui";
import { guardarSeguimientoCitaAction, guardarSeguimientoAsesoriaLlamadaAction } from "./actions";

export type FilaSeguimiento = {
  id: string;
  fecha: string; // dd/mm/yyyy de la cita o de la asesoría
  cliente: string;
  telefono: string;
  sucursal: string;
  abogado: string;
  seguimientoEstado: string;
  seguimientoNota: string;
  seguimientoFecha: string; // yyyy-mm-dd
};

type Origen = "cita" | "asesoria";

const ESTADOS = [
  { value: "", label: "Por contactar", cls: "bg-amber-wash text-amber" },
  { value: "no_contesto", label: "No contestó", cls: "bg-paper text-muted" },
  { value: "llamar_despues", label: "Llamar después", cls: "bg-blue-50 text-blue-700" },
  { value: "agendo_cita", label: "Agendó cita", cls: "bg-success-wash text-success" },
  { value: "descartado", label: "Descartado", cls: "bg-danger-wash text-danger" },
];

function Fila({ f, origen }: { f: FilaSeguimiento; origen: Origen }) {
  const [estado, setEstado] = useState(f.seguimientoEstado);
  const [nota, setNota] = useState(f.seguimientoNota);
  const [fecha, setFecha] = useState(f.seguimientoFecha);
  const [, startTransition] = useTransition();

  function guardar(cambios: Partial<{ estado: string; nota: string; fecha: string }>) {
    const siguiente = { estado, nota, fecha, ...cambios };
    const accion = origen === "cita" ? guardarSeguimientoCitaAction : guardarSeguimientoAsesoriaLlamadaAction;
    startTransition(() => { accion(f.id, siguiente); });
  }

  return (
    <tr className="hover:bg-paper/40 transition-colors">
      <td className="px-5 py-3 num text-muted whitespace-nowrap">{f.fecha}</td>
      <td className="px-3 py-3">
        <p className="font-bold text-ink">{f.cliente}</p>
        {f.telefono && (
          <p className="text-[11.5px] num text-muted"><Phone size={11} className="inline mr-1" />{f.telefono}</p>
        )}
      </td>
      <td className="px-3 py-3 text-muted">{f.sucursal}</td>
      <td className="px-3 py-3 text-muted">{f.abogado}</td>
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
      <td className="px-3 py-3 min-w-[220px]">
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => { if (nota !== f.seguimientoNota) guardar({ nota }); }}
          placeholder="Nota de la llamada…"
          className="w-full px-2 py-1 rounded bg-surface border border-line focus:border-navy/40 focus:outline-none text-[12.5px] placeholder:text-muted/60"
        />
      </td>
    </tr>
  );
}

export default function TablaSeguimiento({
  filas,
  origen,
  encabezadoFecha,
  vacio,
}: {
  filas: FilaSeguimiento[];
  origen: Origen;
  encabezadoFecha: string;
  vacio: string;
}) {
  const porContactar = filas.filter((f) => !f.seguimientoEstado).length;
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <Card className="p-5">
          <p className="eyebrow text-muted">En la lista</p>
          <p className="num text-[34px] font-semibold leading-none mt-3 text-ink">{filas.length}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow text-muted">Por contactar</p>
          <p className="num text-[34px] font-semibold leading-none mt-3 text-amber">{porContactar}</p>
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">{encabezadoFecha}</th>
              <th className="eyebrow text-muted px-3 py-3">Persona</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Estado</th>
              <th className="eyebrow text-muted px-3 py-3">Fecha llamada</th>
              <th className="eyebrow text-muted px-3 py-3">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {filas.map((f) => <Fila key={f.id} f={f} origen={origen} />)}
            {filas.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">{vacio}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
