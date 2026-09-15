"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageTitle, Card } from "@/components/ui";
import type { ResumenAbogado } from "@/lib/services/prospectos";

const PERIODOS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana en curso" },
  { value: "mes", label: "Mes seleccionado" },
] as const;

type Periodo = (typeof PERIODOS)[number]["value"];

const CAMPOS: Record<Periodo, { llamadas: keyof ResumenAbogado; agendaron: keyof ResumenAbogado; llegaron: keyof ResumenAbogado }> = {
  hoy: { llamadas: "llamadasHoy", agendaron: "agendadasHoy", llegaron: "citasHoy" },
  semana: { llamadas: "llamadasSemana", agendaron: "agendadasSemana", llegaron: "citasSemana" },
  mes: { llamadas: "llamadasMes", agendaron: "agendadasMes", llegaron: "citasMes" },
};

const MESES = [
  { num: 1, label: "Enero" },
  { num: 2, label: "Febrero" },
  { num: 3, label: "Marzo" },
  { num: 4, label: "Abril" },
  { num: 5, label: "Mayo" },
  { num: 6, label: "Junio" },
  { num: 7, label: "Julio" },
  { num: 8, label: "Agosto" },
  { num: 9, label: "Septiembre" },
  { num: 10, label: "Octubre" },
  { num: 11, label: "Noviembre" },
  { num: 12, label: "Diciembre" },
];

export default function ReportesClient({
  resumen,
  hoyLabel,
  filtroMes,
  esMesActual,
}: {
  resumen: ResumenAbogado[];
  hoyLabel: string;
  filtroMes: number;
  esMesActual: boolean;
}) {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>("hoy");

  // Hoy/Semana solo tienen sentido para el mes en curso; un mes viejo (ej. agosto,
  // para ver llamadas que se hicieron ahí aunque el prospecto sea de otro mes) solo
  // tiene "Mes seleccionado".
  useEffect(() => {
    if (!esMesActual) setPeriodo("mes");
  }, [esMesActual]);

  const campos = CAMPOS[periodo];
  const mesLabel = MESES.find((m) => m.num === filtroMes)?.label ?? "—";

  return (
    <>
      <PageTitle
        eyebrow="Administración"
        title="Reportes de llamadas"
        subtitle={`Por abogado — hoy es ${hoyLabel}`}
      />

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {MESES.map((m) => (
          <button
            key={m.num}
            onClick={() => router.push(`/reportes?mes=${m.num}`)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${
              filtroMes === m.num ? "bg-navy text-white border-navy" : "border-line text-muted hover:bg-paper"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {PERIODOS.map((p) => {
          const deshabilitado = p.value !== "mes" && !esMesActual;
          return (
            <button
              key={p.value}
              onClick={() => !deshabilitado && setPeriodo(p.value)}
              disabled={deshabilitado}
              title={deshabilitado ? `Solo disponible para ${mesLabel} si es el mes en curso` : undefined}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${
                periodo === p.value
                  ? "bg-navy text-white border-navy"
                  : deshabilitado
                    ? "border-line text-muted/40 cursor-not-allowed"
                    : "border-line text-muted hover:bg-paper"
              }`}
            >
              {p.label}
            </button>
          );
        })}
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
