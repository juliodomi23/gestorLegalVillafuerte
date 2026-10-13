"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Settings2, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import type { Alcance } from "@/lib/chat/alcance";
import { pollingPermitido } from "@/lib/chat/polling";
import { useAltoDisponible } from "@/lib/chat/use-alto";

type Etapa = { id: string; clave: string | null; nombre: string; color: string; orden: number };
type Tarjeta = {
  id: string;
  numero: number;
  nombre: string;
  telefono: string;
  etapaId: string | null;
  etapaDesde: string | null;
  ultimoMensajeAt: string | null;
  preview: string;
  noLeidos: number;
  estado: string;
  canalNombre: string;
  responsable: { id: string; nombre: string } | null;
  etiquetas: { nombre: string; color: string }[];
  requiereAtencion: boolean;
};

function hace(fecha: string | null) {
  if (!fecha) return "";
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 60000));
  if (minutos < 60) return `${minutos} min`;
  if (minutos < 1440) return `${Math.floor(minutos / 60)} h`;
  return `${Math.floor(minutos / 1440)} d`;
}

export function EmbudoCliente({ alcance }: { alcance: Alcance }) {
  const { raiz, alto } = useAltoDisponible();
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [soltarEn, setSoltarEn] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(async () => {
    if (!pollingPermitido(document.visibilityState)) return;
    const response = await fetch("/api/embudo", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setEtapas(data.etapas || []);
    setTarjetas(data.tarjetas || []);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
    const intervalo = window.setInterval(() => void cargar(), 5000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  const porEtapa = useMemo(() => {
    const mapa = new Map<string, Tarjeta[]>();
    for (const etapa of etapas) mapa.set(etapa.id, []);
    for (const tarjeta of tarjetas) {
      const destino = tarjeta.etapaId && mapa.has(tarjeta.etapaId) ? tarjeta.etapaId : etapas[0]?.id;
      if (destino) mapa.get(destino)?.push(tarjeta);
    }
    return mapa;
  }, [etapas, tarjetas]);

  async function mover(tarjetaId: string, etapaId: string) {
    const actual = tarjetas.find((t) => t.id === tarjetaId);
    if (!actual || actual.etapaId === etapaId) return;
    setError("");
    setTarjetas((lista) => lista.map((t) => (t.id === tarjetaId ? { ...t, etapaId, etapaDesde: new Date().toISOString() } : t)));
    const response = await fetch(`/api/conversaciones/${tarjetaId}/etapa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "No se pudo mover la tarjeta");
      await cargar();
    }
  }

  const puedeEditar = alcance === "todas";

  return (
    <div ref={raiz} style={alto ? { height: alto } : undefined} className="flex min-h-[320px] flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {tarjetas.length} conversación{tarjetas.length === 1 ? "" : "es"}
          {alcance === "propias" ? " asignadas a ti" : ""}
        </p>
        {puedeEditar && (
          <button onClick={() => setEditando(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12.5px] hover:border-navy/40">
            <Settings2 size={14} /> Editar etapas
          </button>
        )}
      </div>
      {error && <p className="mb-2 shrink-0 text-[12.5px] text-danger">{error}</p>}

      <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {etapas.map((etapa) => {
          const lista = porEtapa.get(etapa.id) ?? [];
          return (
            <section
              key={etapa.id}
              onDragOver={(event) => {
                event.preventDefault();
                setSoltarEn(etapa.id);
              }}
              onDragLeave={() => setSoltarEn((actual) => (actual === etapa.id ? null : actual))}
              onDrop={(event) => {
                event.preventDefault();
                setSoltarEn(null);
                const id = event.dataTransfer.getData("text/plain") || arrastrando;
                setArrastrando(null);
                if (id) void mover(id, etapa.id);
              }}
              className={`flex min-h-0 w-[82vw] shrink-0 snap-start flex-col rounded-xl border bg-paper/60 sm:w-[270px] ${soltarEn === etapa.id ? "border-navy/50 bg-navy/[.04]" : "border-line"}`}
            >
              <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
                <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: etapa.color }} />
                <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{etapa.nombre}</h3>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] text-muted">{lista.length}</span>
              </header>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                {lista.map((tarjeta) => (
                  <article
                    key={tarjeta.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", tarjeta.id);
                      event.dataTransfer.effectAllowed = "move";
                      setArrastrando(tarjeta.id);
                    }}
                    onDragEnd={() => {
                      setArrastrando(null);
                      setSoltarEn(null);
                    }}
                    className={`rounded-lg border border-line bg-surface p-3 shadow-sm ${arrastrando === tarjeta.id ? "opacity-50" : ""}`}
                  >
                    <Link href={`/chat?c=${tarjeta.numero}`} className="block">
                      <span className="flex items-start justify-between gap-2">
                        <b className="min-w-0 truncate text-[13.5px]">{tarjeta.nombre}</b>
                        {tarjeta.noLeidos > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-success px-1 text-[11px] text-white">{tarjeta.noLeidos}</span>}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-muted">{tarjeta.telefono}</span>
                      {tarjeta.preview && <span className="mt-1.5 line-clamp-2 block text-[12.5px] text-ink/80">{tarjeta.preview}</span>}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {tarjeta.requiereAtencion && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10.5px] text-amber-700">Por atender</span>}
                      {tarjeta.etiquetas.slice(0, 2).map((etiqueta) => (
                        <span key={etiqueta.nombre} className="inline-flex items-center gap-1 rounded border border-line bg-paper px-1.5 py-0.5 text-[10.5px]">
                          <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: etiqueta.color }} />{etiqueta.nombre}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
                      <span className="truncate">{tarjeta.responsable ? tarjeta.responsable.nombre.split(" ")[0] : "Sin asignar"}</span>
                      <span className="shrink-0">{hace(tarjeta.etapaDesde)}</span>
                    </div>
                    {/* En el teléfono no se puede arrastrar: ahí sí hace falta el selector. */}
                    <select
                      aria-label={`Mover a otra etapa: ${tarjeta.nombre}`}
                      value=""
                      onChange={(event) => event.target.value && void mover(tarjeta.id, event.target.value)}
                      className="mt-2 w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[16px] text-muted sm:hidden"
                    >
                      <option value="">Mover a…</option>
                      {etapas.filter((opcion) => opcion.id !== etapa.id).map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
                    </select>
                  </article>
                ))}
                {lista.length === 0 && <p className="px-2 py-6 text-center text-[12px] text-muted">{cargando ? "Cargando…" : "Sin conversaciones"}</p>}
              </div>
            </section>
          );
        })}
      </div>

      {puedeEditar && <EditorEtapas open={editando} onClose={() => setEditando(false)} etapas={etapas} onCambio={cargar} />}
    </div>
  );
}

function EditorEtapas({ open, onClose, etapas, onCambio }: { open: boolean; onClose: () => void; etapas: Etapa[]; onCambio: () => Promise<void> }) {
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState("");

  async function llamar(url: string, metodo: string, cuerpo?: unknown) {
    setError("");
    const response = await fetch(url, {
      method: metodo,
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "No se pudo guardar");
      return false;
    }
    await onCambio();
    return true;
  }

  async function intercambiar(indice: number, otro: number) {
    const a = etapas[indice];
    const b = etapas[otro];
    if (!a || !b) return;
    await llamar(`/api/embudo/etapas/${a.id}`, "PATCH", { orden: b.orden });
    await llamar(`/api/embudo/etapas/${b.id}`, "PATCH", { orden: a.orden });
  }

  return (
    <Modal open={open} onClose={onClose} title="Etapas del embudo" onSubmit={onClose} submitLabel="Listo">
      <div className="col-span-full space-y-2">
        <p className="text-[12.5px] text-muted">
          Renombra, cambia el color o el orden. Las etapas con candado las mueve el sistema sola (cita, llamada, asesoría, firma): se pueden renombrar pero no quitar.
        </p>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        {etapas.map((etapa, indice) => (
          <div key={etapa.id} className="flex items-center gap-2">
            <input
              type="color"
              defaultValue={etapa.color}
              aria-label={`Color de ${etapa.nombre}`}
              onBlur={(event) => event.target.value !== etapa.color && void llamar(`/api/embudo/etapas/${etapa.id}`, "PATCH", { color: event.target.value })}
              className="h-8 w-8 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0.5"
            />
            <input
              defaultValue={etapa.nombre}
              maxLength={40}
              onBlur={(event) => event.target.value.trim() && event.target.value.trim() !== etapa.nombre && void llamar(`/api/embudo/etapas/${etapa.id}`, "PATCH", { nombre: event.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-1.5 text-[16px] sm:text-[13.5px]"
            />
            {etapa.clave && <span title="La mueve el sistema" className="text-[11px] text-muted">🔒</span>}
            <button type="button" aria-label="Subir" disabled={indice === 0} onClick={() => void intercambiar(indice, indice - 1)} className="rounded-lg border border-line p-1.5 disabled:opacity-30"><ArrowUp size={14} /></button>
            <button type="button" aria-label="Bajar" disabled={indice === etapas.length - 1} onClick={() => void intercambiar(indice, indice + 1)} className="rounded-lg border border-line p-1.5 disabled:opacity-30"><ArrowDown size={14} /></button>
            <button type="button" aria-label="Quitar" disabled={Boolean(etapa.clave)} onClick={() => void llamar(`/api/embudo/etapas/${etapa.id}`, "DELETE")} className="rounded-lg border border-line p-1.5 text-danger disabled:opacity-30"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <input value={nueva} onChange={(event) => setNueva(event.target.value)} placeholder="Nueva etapa (p. ej. No asistió)" maxLength={40} className="min-w-0 flex-1 rounded-lg border border-line px-3 py-1.5 text-[16px] sm:text-[13.5px]" />
          <button
            type="button"
            onClick={async () => {
              if (nueva.trim() && (await llamar("/api/embudo/etapas", "POST", { nombre: nueva }))) setNueva("");
            }}
            className="rounded-lg bg-navy px-3 py-1.5 text-[13px] text-white"
          >
            Agregar
          </button>
        </div>
      </div>
    </Modal>
  );
}
