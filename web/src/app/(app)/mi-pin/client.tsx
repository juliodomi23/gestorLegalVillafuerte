"use client";

import { useState } from "react";
import { Loader, KeyRound, Check } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import type { ResultadoPin } from "./page";

export default function MiPinClient({
  pinActual,
  guardar,
}: {
  pinActual: string | null;
  guardar: (pin: string) => Promise<ResultadoPin>;
}) {
  const [pin, setPin] = useState(pinActual ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardado(false);
    setGuardando(true);
    const r = await guardar(pin);
    if (r.ok) {
      setPin(r.pin ?? "");
      setGuardado(true);
    } else {
      setError(r.error);
    }
    setGuardando(false);
  }

  return (
    <>
      <PageTitle eyebrow="Mi cuenta" title="Mi PIN del reloj checador" />
      <Card className="p-5 max-w-md">
        <p className="text-[13px] text-muted mb-4">
          Solo hace falta cuando checas desde un celular donde no tienes la sesión iniciada. Si ya
          entraste al sistema en tu teléfono, el reloj te reconoce sin PIN. Déjalo vacío para
          quitarlo.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="eyebrow text-muted block mb-1.5">PIN (4 a 8 dígitos)</span>
            <input
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
                setGuardado(false);
              }}
              placeholder="Sin PIN"
              className="w-full px-4 py-3 rounded-lg bg-surface border border-line text-[20px] tracking-[0.3em] num focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
            />
          </label>

          {error && <p className="text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2">{error}</p>}
          {guardado && (
            <p className="text-[13px] text-success bg-success-wash rounded-lg px-3 py-2 flex items-center gap-2">
              <Check size={14} /> {pin ? "PIN guardado" : "PIN eliminado"}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-white text-[14px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
          >
            {guardando ? <Loader size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </form>
      </Card>
    </>
  );
}
