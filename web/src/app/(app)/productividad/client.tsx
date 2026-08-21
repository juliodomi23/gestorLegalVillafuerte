"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader, MessageSquare } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { marcarActividadAction } from "./actions";
import type { ActividadDelDia, DiaResumen } from "@/lib/services/productividad";

function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

function Barra({ porcentaje }: { porcentaje: number }) {
  const color = porcentaje === 100 ? "bg-success" : porcentaje >= 50 ? "bg-amber" : "bg-danger";
  return (
    <div className="h-1.5 rounded-full bg-line overflow-hidden w-full">
      <div className={`h-full ${color} transition-all`} style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

export default function ProductividadClient({
  fecha,
  nombreDia,
  esHoy,
  actividades,
  semana,
}: {
  fecha: string;
  nombreDia: string;
  esHoy: boolean;
  actividades: ActividadDelDia[];
  semana: DiaResumen[];
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Optimista: la casilla responde al instante y se corrige sola si el guardado falla.
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});

  const estaMarcada = (a: ActividadDelDia) => marcadas[a.plantillaId] ?? a.realizada;
  const notaDe = (a: ActividadDelDia) => notas[a.plantillaId] ?? a.observaciones;

  async function alternar(a: ActividadDelDia) {
    const nuevo = !estaMarcada(a);
    setError("");
    setMarcadas((m) => ({ ...m, [a.plantillaId]: nuevo }));
    setGuardandoId(a.plantillaId);
    const r = await marcarActividadAction(a.plantillaId, fecha, nuevo);
    setGuardandoId(null);
    if (!r.ok) {
      setMarcadas((m) => ({ ...m, [a.plantillaId]: !nuevo }));
      setError(r.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function guardarNota(a: ActividadDelDia, texto: string) {
    setNotas((n) => ({ ...n, [a.plantillaId]: texto }));
    setNotaAbierta(null);
    const r = await marcarActividadAction(a.plantillaId, fecha, estaMarcada(a), texto);
    if (!r.ok) setError(r.error);
    else startTransition(() => router.refresh());
  }

  function irA(nuevaFecha: string) {
    router.push(`/productividad?fecha=${nuevaFecha}`);
  }

  const hechas = actividades.filter(estaMarcada).length;
  const total = actividades.length;
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

  const totalSemana = semana.reduce((s, d) => s + d.total, 0);
  const hechasSemana = semana.reduce((s, d) => s + d.realizadas, 0);
  const pctSemana = totalSemana > 0 ? Math.round((hechasSemana / totalSemana) * 100) : 0;

  const fechaLarga = (() => {
    const [y, m, d] = fecha.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  return (
    <>
      <PageTitle
        eyebrow="Coordinación de Operaciones y Sistemas"
        title="Productividad"
        subtitle={`${hechas} de ${total} actividades · ${pct}% del día`}
      />

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => irA(sumarDias(fecha, -1))}
              aria-label="Día anterior"
              className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[210px] text-center">
              <div className="font-bold text-[15px] capitalize">{nombreDia}</div>
              <div className="text-[12.5px] text-muted">{fechaLarga}</div>
            </div>
            <button
              onClick={() => irA(sumarDias(fecha, 1))}
              aria-label="Día siguiente"
              className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            {!esHoy && (
              <button
                onClick={() => irA(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }))}
                className="text-[12.5px] text-navy hover:underline ml-1"
              >
                Ir a hoy
              </button>
            )}
          </div>
          <div className="text-right">
            <div className="num font-bold text-[22px] text-navy">{pct}%</div>
            <div className="eyebrow text-muted">del día</div>
          </div>
        </div>
        <Barra porcentaje={pct} />
      </Card>

      {error && (
        <p className="text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <Card className="overflow-hidden mb-5">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-[17px]">Actividades del día</h3>
            <p className="text-[12.5px] text-muted mt-0.5">
              Todas pesan igual. Marca la casilla al completarla; la nota es opcional.
            </p>
          </div>
          {pendiente && <Loader size={15} className="animate-spin text-muted shrink-0" />}
        </div>

        <div className="divide-y divide-line/70">
          {actividades.map((a) => {
            const marcada = estaMarcada(a);
            const nota = notaDe(a);
            return (
              <div key={a.plantillaId} className="px-5 py-3.5">
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => alternar(a)}
                    disabled={guardandoId === a.plantillaId}
                    aria-label={marcada ? "Marcar como pendiente" : "Marcar como realizada"}
                    className={`mt-0.5 w-5 h-5 rounded shrink-0 border grid place-items-center transition-colors ${
                      marcada
                        ? "bg-success border-success text-white"
                        : "border-line hover:border-navy bg-surface"
                    }`}
                  >
                    {guardandoId === a.plantillaId ? (
                      <Loader size={11} className="animate-spin" />
                    ) : marcada ? (
                      <Check size={13} strokeWidth={3} />
                    ) : null}
                  </button>

                  <span className="num text-[12.5px] font-bold text-navy shrink-0 mt-0.5 w-[42px]">
                    {a.hora}
                  </span>

                  <p
                    className={`text-[13.5px] flex-1 leading-relaxed ${
                      marcada ? "text-muted line-through" : "text-ink"
                    }`}
                  >
                    {a.descripcion}
                  </p>

                  <button
                    onClick={() => setNotaAbierta(notaAbierta === a.plantillaId ? null : a.plantillaId)}
                    title="Observaciones"
                    aria-label="Observaciones"
                    className={`p-1.5 rounded-md shrink-0 transition-colors ${
                      nota ? "text-amber hover:bg-amber-wash" : "text-muted/60 hover:text-navy hover:bg-navy/[.06]"
                    }`}
                  >
                    <MessageSquare size={15} />
                  </button>
                </div>

                {notaAbierta === a.plantillaId ? (
                  <textarea
                    autoFocus
                    defaultValue={nota}
                    onBlur={(e) => guardarNota(a, e.target.value)}
                    placeholder="Observaciones…"
                    rows={2}
                    className="w-full mt-2.5 ml-[70px] max-w-[calc(100%-70px)] px-3 py-2 rounded-lg bg-surface border border-line text-[13px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
                  />
                ) : (
                  nota && <p className="text-[12.5px] text-muted ml-[70px] mt-1.5 italic">{nota}</p>
                )}
              </div>
            );
          })}

          {actividades.length === 0 && (
            <p className="px-5 py-10 text-center text-muted text-[14px]">
              No hay actividades para este día.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif text-[17px]">Resumen semanal</h3>
            <p className="text-[12.5px] text-muted mt-0.5">
              {hechasSemana} de {totalSemana} actividades de la semana.
            </p>
          </div>
          <div className="num font-bold text-[20px] text-navy">{pctSemana}%</div>
        </div>

        <div className="grid gap-2.5">
          {semana.map((d) => (
            <button
              key={d.fechaISO}
              onClick={() => irA(d.fechaISO)}
              className={`grid grid-cols-[92px_1fr_auto] items-center gap-3 text-left px-2 py-1.5 -mx-2 rounded-lg transition-colors ${
                d.fechaISO === fecha ? "bg-navy/[.06]" : "hover:bg-paper/70"
              }`}
            >
              <span className={`text-[13px] ${d.fechaISO === fecha ? "font-bold" : "text-muted"}`}>
                {d.nombre}
              </span>
              <Barra porcentaje={d.porcentaje} />
              <span className="num text-[12.5px] text-muted w-[62px] text-right">
                {d.realizadas}/{d.total}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}
