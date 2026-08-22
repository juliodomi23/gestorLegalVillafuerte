"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";

// Aviso para quien todavía trae el PIN que le generó el sistema.
//
// No es un centro de notificaciones: es un aviso puntual para un problema puntual.
// Se puede cerrar por sesión (molestar en cada carga sólo consigue que lo ignoren),
// pero vuelve a salir al día siguiente mientras el PIN siga sin cambiarse — y deja
// de aparecer solo, en cuanto la persona pone el suyo.
export function AvisoPin({ mostrar }: { mostrar: boolean }) {
  const [cerrado, setCerrado] = useState(false);
  if (!mostrar || cerrado) return null;

  return (
    <div className="bg-amber-wash border-b border-amber/30">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3 text-[13.5px]">
        <KeyRound size={16} className="text-amber shrink-0" />
        <p className="flex-1 text-ink">
          <b>Tu PIN del reloj checador te lo asignó el sistema.</b>{" "}
          <span className="text-muted">
            Ponte uno tuyo: el que te dieron lo conoce alguien más, y con él pueden checar por ti.
          </span>
        </p>
        <Link
          href="/mi-pin"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-navy text-white text-[12.5px] font-bold hover:bg-navy-deep transition-colors"
        >
          Cambiar mi PIN
        </Link>
        <button
          onClick={() => setCerrado(true)}
          aria-label="Cerrar aviso"
          title="Cerrar por ahora"
          className="shrink-0 p-1 rounded text-muted hover:text-ink transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
