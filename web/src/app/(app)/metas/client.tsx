"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageTitle, Card } from "@/components/ui";
import type { ResumenMetas, FilaMeta } from "@/lib/services/metas-reporte";
import { guardarMetaAction } from "./actions";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function Barra({ hechos, meta }: { hechos: number; meta: number }) {
  const avance = meta > 0 ? Math.min(100, Math.round((hechos / meta) * 100)) : 0;
  const color = avance >= 100 ? "bg-success" : avance >= 50 ? "bg-navy" : "bg-danger";
  return (
    <div>
      <p className="num text-[13.5px] font-bold">
        {hechos} <span className="text-muted font-normal">/ {meta > 0 ? meta : "sin meta"}</span>
      </p>
      <div className="h-2 rounded-full bg-paper mt-1 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${avance}%` }} />
      </div>
    </div>
  );
}

function FilaSucursal({ fila }: { fila: FilaMeta }) {
  const [contratos, setContratos] = useState(String(fila.contratos));
  const [asesorias, setAsesorias] = useState(String(fila.asesorias));
  const guardar = () => guardarMetaAction(fila.sucursalId, Number(contratos), Number(asesorias));
  const input = "w-14 border border-line rounded px-1.5 py-0.5 text-[12px] num";
  return (
    <tr>
      <td className="px-4 py-2.5 font-bold text-ink">{fila.sucursal}</td>
      <td className="px-2 py-2.5 w-48"><Barra hechos={fila.contratosHechos} meta={fila.contratos} /></td>
      <td className="px-2 py-2.5 w-48"><Barra hechos={fila.asesoriasHechas} meta={fila.asesorias} /></td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <input className={input} type="number" min={0} value={contratos} onChange={(e) => setContratos(e.target.value)} onBlur={guardar} title="Meta de contratos" />{" "}
        <input className={input} type="number" min={0} value={asesorias} onChange={(e) => setAsesorias(e.target.value)} onBlur={guardar} title="Meta de asesorías" />
      </td>
    </tr>
  );
}

export default function MetasClient({ metas, filtroMes }: { metas: ResumenMetas; filtroMes: number }) {
  const router = useRouter();
  return (
    <>
      <PageTitle eyebrow="Administración" title="Estadísticas de contratos" subtitle={`Contratos y asesorías de ${MESES[filtroMes - 1]} contra la meta de cada sucursal`} />

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {MESES.map((label, i) => (
          <button
            key={label}
            onClick={() => router.push(`/metas?mes=${i + 1}`)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${
              filtroMes === i + 1 ? "bg-navy text-white border-navy" : "border-line text-muted hover:bg-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto mb-4">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left bg-paper/50">
              <th className="eyebrow text-muted px-4 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-2 py-3">Contratos firmados</th>
              <th className="eyebrow text-muted px-2 py-3">Asesorías</th>
              <th className="eyebrow text-muted px-4 py-3 text-right">Meta (contr. / ases.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {metas.sucursales.map((f) => (
              <FilaSucursal key={f.sucursalId} fila={f} />
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left bg-paper/50">
              <th className="eyebrow text-muted px-4 py-3">Abogado</th>
              <th className="eyebrow text-muted px-2 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">Contratos</th>
              <th className="eyebrow text-muted px-4 py-3 text-right">Asesorías</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {metas.abogados.map((r) => (
              <tr key={`${r.sucursal}|${r.abogado}`}>
                <td className="px-4 py-2.5 font-bold text-ink">{r.abogado}</td>
                <td className="px-2 py-2.5">{r.sucursal}</td>
                <td className="px-2 py-2.5 num text-right">{r.contratos}</td>
                <td className="px-4 py-2.5 num text-right">{r.asesorias}</td>
              </tr>
            ))}
            {metas.abogados.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Sin asesorías ni contratos en este mes.</td></tr>
            )}
          </tbody>
        </table>
        <p className="text-[11.5px] text-muted px-4 py-3 border-t border-line/70">
          Contratos: asesorías que pasaron a "Contrato firmado" en el mes (por fecha de firma). Asesorías: las registradas en el mes.
        </p>
      </Card>
    </>
  );
}
