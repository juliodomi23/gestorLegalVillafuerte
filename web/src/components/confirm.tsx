"use client";

// Diálogo de confirmación propio, coherente con la estética de la app
// (reemplaza el confirm() nativo del navegador).
//
// Uso:
//   const confirmar = useConfirm();
//   if (await confirmar({ titulo: "¿Borrar?", peligro: true })) { ... }

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Opciones = {
  titulo: string;
  mensaje?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  peligro?: boolean;
};

type ConfirmFn = (opciones: Opciones) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opciones, setOpciones] = useState<Opciones | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirmar = useCallback<ConfirmFn>((opts) => {
    setOpciones(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const cerrar = useCallback((valor: boolean) => {
    resolver.current?.(valor);
    resolver.current = null;
    setOpciones(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {opciones && (
        <div
          className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => cerrar(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-surface rounded-xl border border-line shadow-card w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {opciones.peligro && (
                <span className="shrink-0 mt-0.5 p-2 rounded-lg bg-danger-wash text-danger">
                  <AlertTriangle size={18} />
                </span>
              )}
              <div>
                <h3 className="font-serif text-[18px] text-ink">{opciones.titulo}</h3>
                {opciones.mensaje && <p className="text-[13.5px] text-muted mt-1">{opciones.mensaje}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => cerrar(false)}
                className="px-4 py-2 rounded-lg border border-line text-[13px] hover:border-navy/40 transition-colors"
              >
                {opciones.cancelLabel ?? "Cancelar"}
              </button>
              <button
                autoFocus
                onClick={() => cerrar(true)}
                className={`px-5 py-2 rounded-lg text-white text-[13px] font-bold transition-colors ${
                  opciones.peligro ? "bg-danger hover:bg-danger/90" : "bg-navy hover:bg-navy-deep"
                }`}
              >
                {opciones.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
