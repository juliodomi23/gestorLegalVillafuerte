"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageTitle, Card } from "@/components/ui";
import type { ResumenAbogado } from "@/lib/services/prospectos";
import type { ResumenCitasMes } from "@/lib/services/citas-reporte";
import { guardarMetaAction } from "./actions";
import type { ResumenMetas, FilaMeta } from "@/lib/services/metas-reporte";
import { tasaAsistencia, type ConteoCitas } from "@/lib/citas-reporte-regla";

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

function Indicador({ etiqueta, valor, clase = "text-ink" }: { etiqueta: string; valor: string | number; clase?: string }) {
  return (
    <Card className="p-4">
      <p className="eyebrow text-muted">{etiqueta}</p>
      <p className={`num text-[30px] font-semibold leading-none mt-2 ${clase}`}>{valor}</p>
    </Card>
  );
}

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

function FilaMetaSucursal({ fila, esAdmin }: { fila: FilaMeta; esAdmin: boolean }) {
  const [contratos, setContratos] = useState(String(fila.contratos));
  const [asesorias, setAsesorias] = useState(String(fila.asesorias));
  const guardar = () => guardarMetaAction(fila.sucursalId, Number(contratos), Number(asesorias));
  const input = "w-14 border border-line rounded px-1.5 py-0.5 text-[12px] num";
  return (
    <tr>
      <td className="px-4 py-2.5 font-bold text-ink">{fila.sucursal}</td>
      <td className="px-2 py-2.5 w-48"><Barra hechos={fila.contratosHechos} meta={fila.contratos} /></td>
      <td className="px-2 py-2.5 w-48"><Barra hechos={fila.asesoriasHechas} meta={fila.asesorias} /></td>
      {esAdmin && (
        <td className="px-4 py-2.5 text-right whitespace-nowrap">
          <input className={input} type="number" min={0} value={contratos} onChange={(e) => setContratos(e.target.value)} onBlur={guardar} title="Meta de contratos" />{" "}
          <input className={input} type="number" min={0} value={asesorias} onChange={(e) => setAsesorias(e.target.value)} onBlur={guardar} title="Meta de asesorías" />
        </td>
      )}
    </tr>
  );
}

function pct(c: ConteoCitas) {
  const t = tasaAsistencia(c);
  return t === null ? "—" : `${t}%`;
}

export default function ReportesClient({
  resumen,
  citas,
  metas,
  esAdmin,
  hoyLabel,
  filtroMes,
  esMesActual,
}: {
  resumen: ResumenAbogado[];
  citas: ResumenCitasMes;
  metas: ResumenMetas;
  esAdmin: boolean;
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
        title="Reportes"
        subtitle={`Citas y llamadas — hoy es ${hoyLabel}`}
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

      <h2 className="eyebrow text-muted mb-2">Metas de {mesLabel}: contratos y asesorías</h2>
      <Card className="overflow-x-auto mb-4">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left bg-paper/50">
              <th className="eyebrow text-muted px-4 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-2 py-3">Contratos firmados</th>
              <th className="eyebrow text-muted px-2 py-3">Asesorías</th>
              {esAdmin && <th className="eyebrow text-muted px-4 py-3 text-right">Meta (contr. / ases.)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {metas.sucursales.map((f) => (
              <FilaMetaSucursal key={f.sucursalId} fila={f} esAdmin={esAdmin} />
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto mb-8">
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

      <h2 className="eyebrow text-muted mb-2">Citas de {mesLabel}</h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <Indicador etiqueta="Agendadas" valor={citas.total.agendadas} />
        <Indicador etiqueta="Asistieron" valor={citas.total.asistieron} clase="text-success" />
        <Indicador etiqueta="No llegaron" valor={citas.total.noLlegaron} clase="text-danger" />
        <Indicador etiqueta="Canceladas" valor={citas.total.canceladas} />
        <Indicador etiqueta="Por venir" valor={citas.total.porVenir} />
        <Indicador etiqueta="% asistencia" valor={pct(citas.total)} />
      </div>

      <Card className="overflow-x-auto mb-8">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left bg-paper/50">
              <th className="eyebrow text-muted px-4 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">Agendadas</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">Asistieron</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">No llegaron</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">Canceladas</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">Por venir</th>
              <th className="eyebrow text-muted px-4 py-3 text-right">% asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {citas.porSucursal.map((r) => (
              <tr key={r.sucursal}>
                <td className="px-4 py-2.5 font-bold text-ink">{r.sucursal}</td>
                <td className="px-2 py-2.5 num text-right">{r.agendadas}</td>
                <td className="px-2 py-2.5 num text-right">{r.asistieron}</td>
                <td className="px-2 py-2.5 num text-right">{r.noLlegaron}</td>
                <td className="px-2 py-2.5 num text-right">{r.canceladas}</td>
                <td className="px-2 py-2.5 num text-right">{r.porVenir}</td>
                <td className="px-4 py-2.5 num text-right font-bold">{pct(r)}</td>
              </tr>
            ))}
            {citas.porSucursal.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No hay citas en este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="text-[11.5px] text-muted px-4 py-3 border-t border-line/70">
          "Asistieron" son las citas con una asesoría registrada ese día (por teléfono o nombre); "No llegaron", las que no.
          Las de hoy y días futuros cuentan como "Por venir".
        </p>
      </Card>

      <h2 className="eyebrow text-muted mb-2">Llamadas por abogado</h2>
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
