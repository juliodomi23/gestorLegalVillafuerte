"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cambiarEstadoAction } from "@/app/(app)/expedientes/actions";

const ESTADOS = [
  { valor: "activo",     label: "Activo",     color: "bg-success-wash text-success" },
  { valor: "suspendido", label: "Suspendido",  color: "bg-amber-wash text-amber" },
  { valor: "concluido",  label: "Concluido",   color: "bg-line/60 text-muted" },
  { valor: "archivado",  label: "Archivado",   color: "bg-line/60 text-muted" },
];

const MOTIVOS = [
  "En curso",
  "Cliente no responde",
  "Cliente dejó de pagar",
  "Acuerdo favorable concluido",
  "Sentencia desfavorable",
  "Abandono del caso",
];

export function EstadoEditor({
  expedienteId,
  estadoInicial,
  notaInicial,
}: {
  expedienteId: string;
  estadoInicial: string;
  notaInicial: string | null;
}) {
  const [estado, setEstado] = useState(estadoInicial);
  const [nota, setNota] = useState(notaInicial ?? "");
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cfg = ESTADOS.find((e) => e.valor === estado) ?? ESTADOS[0];

  async function guardar() {
    setGuardando(true);
    await cambiarEstadoAction(expedienteId, estado, nota);
    setGuardando(false);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-bold transition-opacity hover:opacity-80 ${cfg.color}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {cfg.label}
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 bg-white border border-line rounded-xl shadow-card p-4 z-50 w-72">
            <p className="eyebrow text-muted mb-2.5">Estado del expediente</p>

            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {ESTADOS.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  onClick={() => setEstado(e.valor)}
                  className={`px-3 py-1.5 rounded-lg text-[12.5px] font-bold border transition-colors ${
                    estado === e.valor
                      ? `${e.color} border-current/30`
                      : "border-line text-muted hover:border-navy/30 hover:text-ink"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <p className="eyebrow text-muted mb-2">Motivo / nota</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {MOTIVOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setNota(m)}
                  className={`px-2 py-0.5 rounded border text-[11.5px] transition-colors ${
                    nota === m
                      ? "border-navy/30 bg-navy/[.06] text-navy font-bold"
                      : "border-line bg-paper text-muted hover:border-navy/30 hover:text-ink"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota libre sobre el estado del caso…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-[13px] focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none mb-3 transition"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-[13px] text-muted hover:text-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="px-4 py-1.5 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
