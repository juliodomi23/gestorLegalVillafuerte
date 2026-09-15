"use client";

import { useState } from "react";
import { PageTitle, Card } from "@/components/ui";
import type { ResumenAbogado } from "@/lib/services/prospectos";

const PERIODOS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana en curso" },
  { value: "mes", label: "Mes en curso" },
] as const;

type Periodo = (typeof PERIODOS)[number]["value"];

const CAMPOS: Record<Periodo, { llamadas: keyof ResumenAbogado; agendaron: keyof ResumenAbogado; llegaron: keyof ResumenAbogado }> = {
  hoy: { llamadas: "llamadasHoy", agendaron: "agendadasHoy", llegaron: "citasHoy" },
  semana: { llamadas: "llamadasSemana", agendaron: "agendadasSemana", llegaron: "citasSemana" },
  mes: { llamadas: "llamadasMes", agendaron: "agendadasMes", llegaron: "citasMes" },
};

export default function ReportesClient({ resumen, hoyLabel }: { resumen: ResumenAbogado[]; hoyLabel: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const campos = CAMPOS[periodo];

  return (
    <>
      <PageTitle eyebrow="Administración" title="Reportes de llamadas" subtitle={`Por abogado — hoy es ${hoyLabel}`} />

      <div className="flex flex-wrap gap-2 mb-4">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${
              periodo === p.value ? "bg-navy text-white border-navy" : "border-line text-muted hover:bg-paper"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left bg-paper/50">
              <th className="eyebrow text-muted px-4 py-3">Abogado</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">Llamadas</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">Agendaron</th>
              <th className="eyebrow text-muted px-4 py-3 text-right">Llegaron</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {resumen.map((r) => (
              <tr key={r.abogadoId}>
                <td className="px-4 py-2.5 font-bold text-ink">{r.nombre}</td>
                <td className="px-2 py-2.5 num text-right">{r[campos.llamadas]}</td>
                <td className="px-2 py-2.5 num text-right">{r[campos.agendaron]}</td>
                <td className="px-4 py-2.5 num text-right">{r[campos.llegaron]}</td>
              </tr>
            ))}
            {resumen.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No hay abogados activos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
