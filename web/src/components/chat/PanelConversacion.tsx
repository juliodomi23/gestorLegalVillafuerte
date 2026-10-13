"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, CircleUserRound, Phone, Plus, X } from "lucide-react";
import { AvatarContacto } from "./AvatarContacto";
import { EsqueletoChat } from "./MensajesConversacion";

type Etiqueta = { nombre: string; color: string };
type Detalle = {
  id: string;
  numero: number;
  estado: string;
  nombreContacto: string;
  telefono: string;
  atributos: Record<string, unknown>;
  canal: { nombre: string; telefono: string | null; activo: boolean };
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  prospecto: { id: string; nombre: string; telefono: string | null } | null;
  responsable: { id: string; nombre: string } | null;
  etiquetas: Etiqueta[];
  etapa: { id: string; nombre: string; color: string } | null;
  citas: { id: string; fechaHora: string; estado: string; asunto: string | null }[];
  asesorias: { id: string; folio: string | null; fecha: string; status: string; tema: string | null }[];
};
type EtapaOpcion = { id: string; nombre: string };

const ESTADOS = ["abierta", "pendiente", "resuelta", "pospuesta"];

export function PanelConversacion({
  conversacionId,
  version,
  onCambio,
  puedeReasignar,
}: {
  conversacionId: string;
  version: number;
  onCambio: () => void;
  puedeReasignar: boolean;
}) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);
  const [catalogo, setCatalogo] = useState<Etiqueta[]>([]);
  const [etapas, setEtapas] = useState<EtapaOpcion[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [claveAtributo, setClaveAtributo] = useState("");
  const [valorAtributo, setValorAtributo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    fetch(`/api/conversaciones/${conversacionId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (vigente) setDetalle(data?.conversacion || null);
      });
    return () => {
      vigente = false;
    };
  }, [conversacionId, version]);

  useEffect(() => {
    if (puedeReasignar) fetch("/api/chat/usuarios").then((r) => (r.ok ? r.json() : null)).then((d) => d && setUsuarios(d.usuarios || []));
    fetch("/api/chat/etiquetas").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCatalogo(d.etiquetas || []));
    fetch("/api/embudo/etapas").then((r) => (r.ok ? r.json() : null)).then((d) => d && setEtapas(d.etapas || []));
  }, [puedeReasignar]);

  const guardar = useCallback(
    async (cambios: Record<string, unknown>) => {
      setError("");
      const response = await fetch(`/api/conversaciones/${conversacionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "No se pudo guardar");
        return;
      }
      onCambio();
    },
    [conversacionId, onCambio],
  );

  if (!detalle) return <EsqueletoChat />;

  const nombres = detalle.etiquetas.map((etiqueta) => etiqueta.nombre);
  const atributos = Object.entries(detalle.atributos || {});

  async function cambiarEtapa(etapaId: string) {
    setError("");
    const response = await fetch(`/api/conversaciones/${conversacionId}/etapa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "No se pudo mover");
      return;
    }
    onCambio();
  }

  async function agregarEtiqueta() {
    const nombre = nuevaEtiqueta.trim();
    if (!nombre || nombres.includes(nombre)) return;
    setNuevaEtiqueta("");
    await guardar({ etiquetas: [...nombres, nombre] });
  }

  async function agregarAtributo() {
    const clave = claveAtributo.trim();
    if (!clave) return;
    setClaveAtributo("");
    setValorAtributo("");
    await guardar({ atributos: { [clave]: valorAtributo } });
  }

  return (
    <div className="p-5 space-y-5">
      <div className="text-center">
        <AvatarContacto nombre={detalle.nombreContacto} telefono={detalle.telefono} grande />
        <h3 className="font-serif text-[18px] mt-2">{detalle.nombreContacto}</h3>
        <p className="text-[12.5px] text-muted flex items-center justify-center gap-1 mt-1"><Phone size={13} /> {detalle.telefono}</p>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}

      <div className="border-t border-line pt-4 space-y-3 text-[13px]">
        <label className="flex items-center justify-between gap-3">
          <span className="text-muted">Estado</span>
          <select value={detalle.estado === "cerrada" ? "resuelta" : detalle.estado} onChange={(e) => void guardar({ estado: e.target.value })} className="rounded-lg border border-line bg-paper px-2 py-1 text-[12.5px]">
            {ESTADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
          </select>
        </label>
        {!puedeReasignar && <Fila etiqueta="Responsable" valor={detalle.responsable?.nombre || "Sin asignar"} />}
        {puedeReasignar && <label className="flex items-center justify-between gap-3">
          <span className="text-muted">Redirigir a</span>
          <select value={detalle.responsable?.id || ""} onChange={(e) => void guardar({ responsableId: e.target.value || null })} className="min-w-0 max-w-[150px] rounded-lg border border-line bg-paper px-2 py-1 text-[12.5px]">
            <option value="">Sin asignar</option>
            {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>)}
          </select>
        </label>}
        <label className="flex items-center justify-between gap-3">
          <span className="text-muted">Etapa</span>
          <select value={detalle.etapa?.id || ""} onChange={(e) => void cambiarEtapa(e.target.value)} className="min-w-0 max-w-[150px] rounded-lg border border-line bg-paper px-2 py-1 text-[12.5px]">
            {!detalle.etapa && <option value="">Sin etapa</option>}
            {etapas.map((etapa) => <option key={etapa.id} value={etapa.id}>{etapa.nombre}</option>)}
          </select>
        </label>
        <Fila etiqueta="Canal" valor={`${detalle.canal.nombre}${detalle.canal.activo ? "" : " · inactivo"}`} />
      </div>

      <div className="border-t border-line pt-4">
        <p className="eyebrow text-muted mb-2">Etiquetas</p>
        <div className="flex flex-wrap gap-1.5">
          {detalle.etiquetas.map((etiqueta) => (
            <span key={etiqueta.nombre} className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-[11.5px]">
              <i className="h-2 w-2 rounded-full" style={{ backgroundColor: etiqueta.color }} />
              {etiqueta.nombre}
              <button aria-label={`Quitar ${etiqueta.nombre}`} onClick={() => void guardar({ etiquetas: nombres.filter((n) => n !== etiqueta.nombre) })} className="text-muted hover:text-danger"><X size={12} /></button>
            </span>
          ))}
          {detalle.etiquetas.length === 0 && <span className="text-[12px] text-muted">Sin etiquetas.</span>}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            list="etiquetas-chat"
            value={nuevaEtiqueta}
            onChange={(e) => setNuevaEtiqueta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void agregarEtiqueta()}
            placeholder="Agregar etiqueta…"
            className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1 text-[12.5px]"
          />
          <datalist id="etiquetas-chat">{catalogo.filter((e) => !nombres.includes(e.nombre)).map((e) => <option key={e.nombre} value={e.nombre} />)}</datalist>
          <button onClick={() => void agregarEtiqueta()} aria-label="Agregar etiqueta" className="rounded-lg border border-line p-1.5 hover:border-navy/40"><Plus size={14} /></button>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <p className="eyebrow text-muted mb-2">Atributos</p>
        <div className="space-y-1.5 text-[12.5px]">
          {atributos.map(([clave, valor]) => (
            <div key={clave} className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words"><b>{clave}</b>: {typeof valor === "string" ? valor : JSON.stringify(valor)}</span>
              <button aria-label={`Quitar ${clave}`} onClick={() => void guardar({ quitarAtributo: clave })} className="shrink-0 text-muted hover:text-danger"><X size={12} /></button>
            </div>
          ))}
          {atributos.length === 0 && <p className="text-muted">Sin atributos.</p>}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input value={claveAtributo} onChange={(e) => setClaveAtributo(e.target.value)} placeholder="Clave" className="min-w-0 w-[40%] rounded-lg border border-line px-2 py-1 text-[12.5px]" />
          <input value={valorAtributo} onChange={(e) => setValorAtributo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void agregarAtributo()} placeholder="Valor" className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1 text-[12.5px]" />
          <button onClick={() => void agregarAtributo()} aria-label="Agregar atributo" className="rounded-lg border border-line p-1.5 hover:border-navy/40"><Plus size={14} /></button>
        </div>
      </div>

      {(detalle.citas.length > 0 || detalle.asesorias.length > 0) && (
        <div className="border-t border-line pt-4">
          <p className="eyebrow text-muted mb-2">Ligado a este chat</p>
          <ul className="space-y-1.5 text-[12.5px]">
            {detalle.citas.map((cita) => (
              <li key={cita.id} className="flex justify-between gap-2">
                <span>Cita · {new Date(cita.fechaHora).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-muted">{cita.estado}</span>
              </li>
            ))}
            {detalle.asesorias.map((asesoria) => (
              <li key={asesoria.id} className="flex justify-between gap-2">
                <span>Asesoría{asesoria.folio ? ` ${asesoria.folio}` : ""}</span>
                <span className="text-muted">{asesoria.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <p className="eyebrow text-muted mb-2">Vinculación por teléfono</p>
        {detalle.cliente ? (
          <Link href={`/clientes/${detalle.cliente.id}`} className="flex items-center gap-2 rounded-lg border border-line p-3 hover:border-navy/40">
            <BriefcaseBusiness size={17} className="text-navy" />
            <span><b className="block text-[13px]">Cliente</b><span className="text-[12px] text-muted">{detalle.cliente.nombre}</span></span>
          </Link>
        ) : detalle.prospecto ? (
          <Link href="/prospectos" className="flex items-center gap-2 rounded-lg border border-line p-3 hover:border-navy/40">
            <CircleUserRound size={17} className="text-amber" />
            <span><b className="block text-[13px]">Prospecto</b><span className="text-[12px] text-muted">{detalle.prospecto.nombre}</span></span>
          </Link>
        ) : (
          <p className="text-[12.5px] text-muted">Sin coincidencia inequívoca en Clientes o Prospectos.</p>
        )}
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted">{etiqueta}</span><b className="text-right">{valor}</b></div>;
}
