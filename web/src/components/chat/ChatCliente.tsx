"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, Lock, MessageCircle, Paperclip, Search, Send } from "lucide-react";
import { Card } from "@/components/ui";
import { estadoVentana } from "@/lib/meta/ventana";
import { pollingPermitido } from "@/lib/chat/polling";
import { PanelConversacion } from "./PanelConversacion";
import { EnviarPlantilla } from "./EnviarPlantilla";

export type EtiquetaItem = { nombre: string; color: string };

export type ConversacionItem = {
  id: string;
  numero: number;
  contacto: { nombre: string; telefono: string };
  noLeidos: number;
  ultimoMensajeAt: string | null;
  preview: string;
  estado: string;
  canalId: string;
  canalNombre: string;
  canalActivo: boolean;
  responsable: { id: string; nombre: string } | null;
  etiquetas: EtiquetaItem[];
  vinculo: { tipo: "cliente" | "prospecto"; id: string; nombre: string } | null;
};

type Mensaje = {
  id: string;
  direccion: "entrante" | "saliente";
  tipo: string;
  contenido: string | null;
  status: string;
  errorDetalle: string | null;
  privado: boolean;
  tieneMedia: boolean;
  mediaMime: string | null;
  mediaNombre: string | null;
  timestamp: string;
};

type Pestana = "todas" | "mias" | "sin_asignar";

const ESTADOS = [
  { valor: "todos", texto: "Todos los estados" },
  { valor: "abierta", texto: "Abiertas" },
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "resuelta", texto: "Resueltas" },
  { valor: "pospuesta", texto: "Pospuestas" },
];

function hora(fecha: string | null) {
  return fecha ? new Date(fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
}

function Adjunto({ mensaje }: { mensaje: Mensaje }) {
  if (!mensaje.tieneMedia) return null;
  const url = `/api/mensajes/${mensaje.id}/media`;
  const mime = mensaje.mediaMime || "";
  if (mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={mensaje.mediaNombre || "Imagen"} className="mt-2 max-h-56 rounded-lg" />;
  }
  if (mime.startsWith("audio/")) return <audio controls src={url} className="mt-2 w-full max-w-[260px]" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] underline">
      <Paperclip size={13} /> {mensaje.mediaNombre || "Descargar archivo"}
    </a>
  );
}

export function ChatCliente({ usuarioId }: { usuarioId: string }) {
  const [conversaciones, setConversaciones] = useState<ConversacionItem[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState<Pestana>("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [texto, setTexto] = useState("");
  const [esNota, setEsNota] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [versionPanel, setVersionPanel] = useState(0);
  const seleccionadaRef = useRef<string | null>(null);
  seleccionadaRef.current = seleccionadaId;

  const cargarConversaciones = useCallback(async () => {
    const response = await fetch("/api/conversaciones", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const nuevas = data.conversaciones || [];
    setConversaciones(nuevas);
    setSeleccionadaId((actual) => actual || nuevas[0]?.id || null);
  }, []);

  const cargarMensajes = useCallback(async (id: string) => {
    const response = await fetch(`/api/conversaciones/${id}/mensajes`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setMensajes(data.mensajes || []);
  }, []);

  const refrescarVisible = useCallback(async () => {
    if (!pollingPermitido(document.visibilityState)) return;
    await cargarConversaciones();
    if (seleccionadaRef.current) {
      await cargarMensajes(seleccionadaRef.current);
      setVersionPanel((valor) => valor + 1);
    }
  }, [cargarConversaciones, cargarMensajes]);

  useEffect(() => {
    void refrescarVisible();
    const intervalo = window.setInterval(() => void refrescarVisible(), 3000);
    const alCambiarVisibilidad = () => {
      if (pollingPermitido(document.visibilityState)) void refrescarVisible();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [refrescarVisible]);

  useEffect(() => {
    if (seleccionadaId) void cargarMensajes(seleccionadaId);
    else setMensajes([]);
  }, [seleccionadaId, cargarMensajes]);

  const seleccionada = conversaciones.find((item) => item.id === seleccionadaId) || null;

  const etiquetasDisponibles = useMemo(() => {
    const todas = new Map<string, string>();
    for (const item of conversaciones) for (const etiqueta of item.etiquetas) todas.set(etiqueta.nombre, etiqueta.color);
    return [...todas.keys()].sort();
  }, [conversaciones]);

  const conteos = useMemo(
    () => ({
      todas: conversaciones.length,
      mias: conversaciones.filter((item) => item.responsable?.id === usuarioId).length,
      sin_asignar: conversaciones.filter((item) => !item.responsable).length,
    }),
    [conversaciones, usuarioId],
  );

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return conversaciones.filter((item) => {
      if (pestana === "mias" && item.responsable?.id !== usuarioId) return false;
      if (pestana === "sin_asignar" && item.responsable) return false;
      if (filtroEstado !== "todos" && item.estado !== filtroEstado) return false;
      if (filtroEtiqueta && !item.etiquetas.some((etiqueta) => etiqueta.nombre === filtroEtiqueta)) return false;
      if (!termino) return true;
      return `${item.contacto.nombre} ${item.contacto.telefono}`.toLowerCase().includes(termino);
    });
  }, [busqueda, conversaciones, filtroEstado, filtroEtiqueta, pestana, usuarioId]);

  const ultimoEntrante = [...mensajes].reverse().find((mensaje) => mensaje.direccion === "entrante")?.timestamp;
  const ventanaAbierta = estadoVentana(ultimoEntrante).abierta;
  const puedeEscribir = esNota || ventanaAbierta;

  async function enviar() {
    if (!seleccionadaId || !texto.trim()) return;
    setEnviando(true);
    setError("");
    const response = await fetch("/api/mensajes/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversacionId: seleccionadaId, texto, privado: esNota }),
    });
    const data = await response.json().catch(() => ({}));
    setEnviando(false);
    if (!response.ok) {
      setError(data.error || "No se pudo enviar");
      if (data.ventanaCerrada) setModalPlantilla(true);
      return;
    }
    setTexto("");
    await refrescarVisible();
  }

  const pestanas: { id: Pestana; texto: string }[] = [
    { id: "todas", texto: "Todas" },
    { id: "mias", texto: "Mías" },
    { id: "sin_asignar", texto: "Sin asignar" },
  ];

  return (
    <Card className="overflow-hidden min-h-[650px]">
      <div className="grid min-h-[650px] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <section className="border-b border-line xl:border-b-0 xl:border-r">
          <div className="flex border-b border-line text-[12.5px]">
            {pestanas.map((item) => (
              <button
                key={item.id}
                onClick={() => setPestana(item.id)}
                className={`flex-1 px-2 py-2.5 transition-colors ${pestana === item.id ? "border-b-2 border-navy font-semibold text-navy" : "text-muted hover:text-ink"}`}
              >
                {item.texto} <span className="text-[11px] text-muted">{conteos[item.id]}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2 p-3 border-b border-line">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar conversación…"
                className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
            <div className="flex gap-2">
              <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-[12px]">
                {ESTADOS.map((estado) => <option key={estado.valor} value={estado.valor}>{estado.texto}</option>)}
              </select>
              <select value={filtroEtiqueta} onChange={(event) => setFiltroEtiqueta(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-[12px]">
                <option value="">Todas las etiquetas</option>
                {etiquetasDisponibles.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-line/70">
            {filtradas.map((item) => (
              <button
                key={item.id}
                onClick={() => setSeleccionadaId(item.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${item.id === seleccionadaId ? "bg-navy/[.07]" : "hover:bg-paper"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-full bg-success-wash text-success flex items-center justify-center shrink-0"><MessageCircle size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2"><b className="truncate text-[13.5px]">{item.contacto.nombre}</b><small className="text-muted">{hora(item.ultimoMensajeAt)}</small></span>
                    <span className="block truncate text-[12.5px] text-muted mt-0.5">{item.preview || "Sin mensajes"}</span>
                    {(item.etiquetas.length > 0 || item.estado !== "abierta" || item.responsable) && (
                      <span className="mt-1.5 flex flex-wrap items-center gap-1">
                        {item.estado !== "abierta" && <span className="rounded bg-paper px-1.5 py-0.5 text-[10.5px] text-muted border border-line">{item.estado}</span>}
                        {item.etiquetas.slice(0, 3).map((etiqueta) => (
                          <span key={etiqueta.nombre} className="inline-flex items-center gap-1 rounded bg-paper px-1.5 py-0.5 text-[10.5px] border border-line">
                            <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: etiqueta.color }} />{etiqueta.nombre}
                          </span>
                        ))}
                        {item.responsable && <span className="text-[10.5px] text-muted">· {item.responsable.nombre.split(" ")[0]}</span>}
                      </span>
                    )}
                  </span>
                  {item.noLeidos > 0 && <span className="rounded-full bg-success text-white text-[11px] min-w-5 h-5 px-1 flex items-center justify-center">{item.noLeidos}</span>}
                </div>
              </button>
            ))}
            {filtradas.length === 0 && <p className="p-8 text-center text-[13px] text-muted">Sin conversaciones.</p>}
          </div>
        </section>

        <section className="flex min-h-[650px] flex-col border-b border-line xl:border-b-0 xl:border-r">
          {seleccionada ? (
            <>
              <header className="px-5 py-3 border-b border-line">
                <h2 className="font-serif text-[18px]">{seleccionada.contacto.nombre}</h2>
                <p className="text-[12px] text-muted">{seleccionada.contacto.telefono} · {seleccionada.canalNombre} · #{seleccionada.numero}</p>
              </header>
              <div className="flex-1 overflow-y-auto bg-paper/50 px-4 py-5 space-y-3 max-h-[500px]">
                {mensajes.map((mensaje) => {
                  const saliente = mensaje.direccion === "saliente";
                  const estilo = mensaje.privado
                    ? "bg-amber-50 border border-amber-200 text-ink"
                    : saliente
                      ? "bg-navy text-white"
                      : "bg-surface border border-line";
                  return (
                    <div key={mensaje.id} className={`flex ${saliente ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-[13.5px] shadow-sm ${estilo}`}>
                        {mensaje.privado && <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700"><Lock size={11} /> Nota privada · no sale al cliente</p>}
                        <p className="whitespace-pre-wrap">{mensaje.contenido || `[${mensaje.tipo}]`}</p>
                        <Adjunto mensaje={mensaje} />
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${saliente && !mensaje.privado ? "text-white/60" : "text-muted"}`}>
                          {hora(mensaje.timestamp)}
                          {saliente && !mensaje.privado && <CheckCheck size={12} className={mensaje.status === "leido" ? "text-sky-300" : ""} />}
                        </div>
                        {mensaje.errorDetalle && <p className="mt-1 text-[11px] text-danger">{mensaje.errorDetalle}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <footer className="border-t border-line p-3">
                {!ventanaAbierta && !esNota && <p className="mb-2 text-[12px] text-amber">Ventana de 24 h cerrada: usa una plantilla aprobada o escribe una nota privada.</p>}
                {error && <p className="mb-2 text-[12px] text-danger">{error}</p>}
                <label className="mb-2 flex items-center gap-2 text-[12px] text-muted">
                  <input type="checkbox" checked={esNota} onChange={(event) => setEsNota(event.target.checked)} />
                  Nota privada (solo la ve el equipo)
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setModalPlantilla(true)} className="px-3 py-2 rounded-lg border border-line text-[12.5px] hover:border-navy/40">Plantilla</button>
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    disabled={!puedeEscribir}
                    rows={2}
                    placeholder={esNota ? "Escribe una nota interna…" : ventanaAbierta ? "Escribe un mensaje…" : "Solo plantillas fuera de 24 h"}
                    className={`flex-1 resize-none rounded-lg border px-3 py-2 text-[13.5px] outline-none focus:ring-2 focus:ring-navy/20 disabled:bg-paper ${esNota ? "border-amber-300 bg-amber-50" : "border-line"}`}
                  />
                  <button onClick={enviar} disabled={!puedeEscribir || !texto.trim() || enviando} aria-label="Enviar" className="self-end p-2.5 rounded-lg bg-navy text-white disabled:opacity-40"><Send size={18} /></button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted text-[14px]">Selecciona una conversación.</div>
          )}
        </section>

        <aside className="min-h-[300px]">
          {seleccionada ? (
            <PanelConversacion conversacionId={seleccionada.id} version={versionPanel} onCambio={() => void refrescarVisible()} />
          ) : null}
        </aside>
      </div>
      {seleccionada && (
        <EnviarPlantilla
          open={modalPlantilla}
          onClose={() => setModalPlantilla(false)}
          canalId={seleccionada.canalId}
          conversacionId={seleccionada.id}
          nombreContacto={seleccionada.contacto.nombre}
          onEnviado={() => void refrescarVisible()}
        />
      )}
    </Card>
  );
}
