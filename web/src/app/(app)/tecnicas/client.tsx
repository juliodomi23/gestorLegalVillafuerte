"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import type { Leccion } from "@/lib/tecnicas";
import { marcarVistaAction } from "./actions";

export type AvanceUsuario = { nombre: string; vistas: Record<string, string> };

const archivoUrl = (archivo: string) => `/api/tecnicas/${encodeURIComponent(archivo)}`;

export default function TecnicasClient({
  lecciones,
  misVistas,
  equipo,
}: {
  lecciones: Leccion[];
  misVistas: Record<string, string>;
  equipo: AvanceUsuario[] | null;
}) {
  const primeraPendiente = lecciones.findIndex((l) => !misVistas[l.id]);
  const [actual, setActual] = useState(Math.max(primeraPendiente, 0));
  const maxVisto = useRef(0);
  const leccion = lecciones[actual];
  const vistas = lecciones.filter((l) => misVistas[l.id]).length;

  // Solo cuenta como vista si la reprodujo completa: no se puede adelantar más allá
  // de lo que ya vio. Regresar sí se puede, y una lección ya vista se adelanta libre.
  function alAdelantar(v: HTMLVideoElement) {
    if (leccion && !misVistas[leccion.id] && v.currentTime > maxVisto.current + 2) v.currentTime = maxVisto.current;
  }

  if (lecciones.length === 0) {
    return (
      <div>
        <PageTitle eyebrow="Capacitación" title="Técnicas para asesoras" />
        <Card className="p-8 text-center text-muted text-[14px]">Todavía no hay lecciones cargadas.</Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        eyebrow="Capacitación"
        title="Técnicas para asesoras"
        subtitle={`Llevas ${vistas} de ${lecciones.length} lecciones. Una lección cuenta como vista al terminar el video.`}
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <Card className="p-4">
          <video
            key={leccion.id}
            src={archivoUrl(leccion.video)}
            controls
            controlsList="nodownload"
            preload="metadata"
            className="w-full rounded-lg bg-black aspect-video"
            onLoadedMetadata={() => (maxVisto.current = 0)}
            onTimeUpdate={(e) => (maxVisto.current = Math.max(maxVisto.current, e.currentTarget.currentTime))}
            onSeeking={(e) => alAdelantar(e.currentTarget)}
            onEnded={() => !misVistas[leccion.id] && marcarVistaAction(leccion.id)}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <h2 className="font-serif text-[20px] text-ink">
              {leccion.titulo}
            </h2>
            {misVistas[leccion.id] && (
              <span className="text-[12px] px-2.5 py-1 rounded-full bg-success-wash text-success whitespace-nowrap">
                Vista el {misVistas[leccion.id]}
              </span>
            )}
          </div>
          {leccion.apunte && (
            <img src={archivoUrl(leccion.apunte)} alt={`Apunte de ${leccion.titulo}`} className="mt-4 max-h-[600px] rounded-lg border border-line" />
          )}
        </Card>

        <Card className="p-2 self-start">
          {lecciones.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setActual(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[14px] transition-colors ${
                i === actual ? "bg-navy/[.06] text-navy font-bold" : "hover:bg-navy/[.03] text-ink"
              }`}
            >
              {misVistas[l.id] ? (
                <CheckCircle2 size={18} className="text-success shrink-0" />
              ) : i === actual ? (
                <PlayCircle size={18} className="text-amber shrink-0" />
              ) : (
                <Circle size={18} className="text-muted shrink-0" />
              )}
              <span>{l.titulo}</span>
            </button>
          ))}
        </Card>
      </div>

      {equipo && (
        <Card className="mt-6 overflow-x-auto">
          <div className="px-5 pt-4 pb-2">
            <p className="eyebrow text-amber">Control</p>
            <h2 className="font-serif text-[20px] text-ink">Avance del equipo</h2>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="text-left font-normal px-5 py-2">Usuario</th>
                {lecciones.map((l) => (
                  <th key={l.id} title={l.titulo} className="font-normal px-2 py-2 text-center">
                    {l.numero}
                  </th>
                ))}
                <th className="font-normal px-5 py-2 text-right">Avance</th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((u) => {
                const total = lecciones.filter((l) => u.vistas[l.id]).length;
                return (
                  <tr key={u.nombre} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-ink whitespace-nowrap">{u.nombre}</td>
                    {lecciones.map((l) => (
                      <td key={l.id} className="px-2 py-2.5 text-center" title={u.vistas[l.id] ? `Vista el ${u.vistas[l.id]}` : "Pendiente"}>
                        {u.vistas[l.id] ? <CheckCircle2 size={16} className="text-success inline" /> : <span className="text-muted">—</span>}
                      </td>
                    ))}
                    <td className={`px-5 py-2.5 text-right font-bold ${total === lecciones.length ? "text-success" : "text-ink"}`}>
                      {total}/{lecciones.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
