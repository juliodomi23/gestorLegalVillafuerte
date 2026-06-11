"use client";

import { useState, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";
import { renombrarExpedienteAction } from "@/app/(app)/expedientes/actions";

export function EditarNumeroExpediente({
  expedienteId,
  numeroActual,
}: {
  expedienteId: string;
  numeroActual: string;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(numeroActual);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function abrir() {
    setValor(numeroActual);
    setError(null);
    setEditando(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function cancelar() {
    setEditando(false);
    setError(null);
  }

  async function guardar() {
    if (valor.trim() === numeroActual) { cancelar(); return; }
    setGuardando(true);
    const res = await renombrarExpedienteAction(expedienteId, valor);
    setGuardando(false);
    if (res?.error) { setError(res.error); return; }
    setEditando(false);
  }

  if (!editando) {
    return (
      <div className="flex items-center gap-2 group">
        <h1 className="exp-no text-[26px] font-semibold text-ink">{numeroActual}</h1>
        <button
          onClick={abrir}
          title="Renombrar expediente"
          className="text-muted hover:text-navy transition-colors opacity-0 group-hover:opacity-100"
        >
          <Pencil size={15} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={valor}
          onChange={(e) => { setValor(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") cancelar(); }}
          className="exp-no text-[20px] font-semibold text-ink border border-navy/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20 w-52"
          disabled={guardando}
        />
        <button
          onClick={guardar}
          disabled={guardando}
          title="Guardar"
          className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center hover:bg-navy/80 transition-colors disabled:opacity-50"
        >
          <Check size={15} strokeWidth={2} />
        </button>
        <button
          onClick={cancelar}
          title="Cancelar"
          className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:text-ink transition-colors"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
