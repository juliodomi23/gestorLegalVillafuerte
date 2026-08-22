"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";

// Estado del PIN de quien está viendo la pantalla.
//   "sin_pin"  → nunca ha puesto uno; sólo puede checar con la sesión iniciada
//   "generado" → se lo asignó el sistema y todavía no lo cambia
//   "propio"   → lo eligió él; no hay nada que avisar
export type EstadoPin = "sin_pin" | "generado" | "propio";

const MENSAJES: Record<Exclude<EstadoPin, "propio">, { titulo: string; detalle: string; boton: string }> = {
  sin_pin: {
    titulo: "Todavía no tienes PIN del reloj checador.",
    detalle:
      "Sin PIN sólo puedes checar desde un celular donde ya tengas la sesión iniciada. Créalo en 10 segundos.",
    boton: "Crear mi PIN",
  },
  generado: {
    titulo: "Tu PIN del reloj checador te lo asignó el sistema.",
    detalle: "Ponte uno tuyo: el que te dieron lo conoce alguien más, y con él pueden checar por ti.",
    boton: "Cambiar mi PIN",
  },
};

// Aviso puntual para un problema puntual, no un centro de notificaciones (eso vive en
// la campana del topbar). Se puede cerrar por sesión: molestar en cada carga sólo
// consigue que lo ignoren. Desaparece solo en cuanto la persona pone su PIN.
export function AvisoPin({ estado }: { estado: EstadoPin }) {
  const [cerrado, setCerrado] = useState(false);
  if (estado === "propio" || cerrado) return null;

  const m = MENSAJES[estado];

  return (
    <div className="bg-amber-wash border-b border-amber/30">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3 text-[13.5px]">
        <KeyRound size={16} className="text-amber shrink-0" />
        <p className="flex-1 text-ink">
          <b>{m.titulo}</b> <span className="text-muted">{m.detalle}</span>
        </p>
        <Link
          href="/mi-pin"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-navy text-white text-[12.5px] font-bold hover:bg-navy-deep transition-colors"
        >
          {m.boton}
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
