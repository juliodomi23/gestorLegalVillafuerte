"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, ChevronLeft, Info, Lock, MessageCircle, Paperclip, Search, Send } from "lucide-react";
import { estadoVentana } from "@/lib/meta/ventana";
import { pollingPermitido } from "@/lib/chat/polling";
import type { Alcance } from "@/lib/chat/alcance";
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
  requiereAtencion: boolean;
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

type Pestana = "por_atender" | "mias" | "sin_asignar" | "todas";

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

export function ChatCliente({ usuarioId, alcance }: { usuarioId: string; alcance: Alcance }) {
  const [conversaciones, setConversaciones] = useState<ConversacionItem[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState<Pestana>(alcance === "todas" ? "todas" : "por_atender");
  const [filtroCanal, setFiltroCanal] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [texto, setTexto] = useState("");
  const [esNota, setEsNota] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [versionPanel, setVersionPanel] = useState(0);
  const [vista, setVista] = useState<"lista" | "chat" | "info">("lista");
  const [alto, setAlto] = useState<number | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const seleccionadaRef = useRef<string | null>(null);
  seleccionadaRef.current = seleccionadaId;

  // El chat ocupa exactamente lo que queda de pantalla debajo de su posición:
  // la página no se desplaza y cada columna hace su propio scroll.
  useLayoutEffect(() => {
    function medir() {
      const elemento = raiz.current;
      if (!elemento) return;
      const relleno = parseFloat(getComputedStyle(elemento.closest("main") ?? document.body).paddingBottom) || 0;
      const arriba = elemento.getBoundingClientRect().top + window.scrollY;
      const visible = window.visualViewport?.height ?? window.innerHeight;
      setAlto(Math.max(320, Math.floor(visible - arriba - relleno)));
    }
    medir();
    void document.fonts?.ready.then(medir);
    // El aviso de PIN y otros bloques de arriba cambian de alto al cargar: se vuelve a medir.
    const observador = new ResizeObserver(medir);
    observador.observe(document.body);
    window.addEventListener("resize", medir);
    window.visualViewport?.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
      window.visualViewport?.removeEventListener("resize", medir);
    };
  }, []);

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

  const canales = useMemo(() => {
    const porId = new Map<string, string>();
    for (const item of conversaciones) porId.set(item.canalId, item.canalNombre);
    return [...porId.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [conversaciones]);

  const conteos = useMemo(
    () => ({
      por_atender: conversaciones.filter((item) => item.requiereAtencion).length,
      todas: conversaciones.length,
      mias: conversaciones.filter((item) => item.responsable?.id === usuarioId).length,
      sin_asignar: conversaciones.filter((item) => !item.responsable).length,
    }),
    [conversaciones, usuarioId],
  );

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return conversaciones.filter((item) => {
      if (pestana === "por_atender" && !item.requiereAtencion) return false;
      if (pestana === "mias" && item.responsable?.id !== usuarioId) return false;
      if (filtroCanal && item.canalId !== filtroCanal) return false;
      if (pestana === "sin_asignar" && item.responsable) return false;
      if (filtroEstado !== "todos" && item.estado !== filtroEstado) return false;
      if (filtroEtiqueta && !item.etiquetas.some((etiqueta) => etiqueta.nombre === filtroEtiqueta)) return false;
      if (!termino) return true;
      return `${item.contacto.nombre} ${item.contacto.telefono}`.toLowerCase().includes(termino);
    });
  }, [busqueda, conversaciones, filtroCanal, filtroEstado, filtroEtiqueta, pestana, usuarioId]);

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

  const pestanas: { id: Pestana; texto: string }[] =
    alcance === "todas"
      ? [
          { id: "por_atender", texto: "Por atender" },
          { id: "mias", texto: "Mías" },
          { id: "sin_asignar", texto: "Sin asignar" },
          { id: "todas", texto: "Todas" },
        ]
      : alcance === "recepcion"
        ? [
            { id: "por_atender", texto: "Por atender" },
            { id: "mias", texto: "Mías" },
          ]
        : [];

  const campoFiltro =
    "min-w-[calc(50%-0.25rem)] flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-[16px] sm:text-[12px]";

  return (
    <div
      ref={raiz}
      style={alto ? { height: alto } : undefined}
      className="relative flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card"
    >
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Lista */}
        <section className={`${vista === "lista" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col border-line lg:flex lg:border-r`}>
          {pestanas.length > 0 && (
            <div className="flex shrink-0 overflow-x-auto border-b border-line text-[12.5px]">
              {pestanas.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPestana(item.id)}
                  className={`flex-1 shrink-0 whitespace-nowrap px-3 py-2.5 transition-colors ${pestana === item.id ? "border-b-2 border-navy font-semibold text-navy" : "text-muted hover:text-ink"}`}
                >
                  {item.texto} <span className="text-[11px] text-muted">{conteos[item.id]}</span>
                </button>
              ))}
            </div>
          )}
          <div className="shrink-0 space-y-2 border-b border-line p-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar conversación…"
                className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-[16px] outline-none focus:ring-2 focus:ring-navy/20 sm:text-[13px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {canales.length > 1 && (
                <select value={filtroCanal} onChange={(event) => setFiltroCanal(event.target.value)} className={campoFiltro}>
                  <option value="">Todos los números</option>
                  {canales.map((canal) => <option key={canal.id} value={canal.id}>{canal.nombre}</option>)}
                </select>
              )}
              <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)} className={campoFiltro}>
                {ESTADOS.map((estado) => <option key={estado.valor} value={estado.valor}>{estado.texto}</option>)}
              </select>
              <select value={filtroEtiqueta} onChange={(event) => setFiltroEtiqueta(event.target.value)} className={campoFiltro}>
                <option value="">Todas las etiquetas</option>
                {etiquetasDisponibles.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-line/70 overflow-y-auto">
            {filtradas.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSeleccionadaId(item.id);
                  setVista("chat");
                }}
                className={`w-full px-4 py-3 text-left transition-colors ${item.id === seleccionadaId ? "bg-navy/[.07]" : "hover:bg-paper"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-wash text-success"><MessageCircle size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2"><b className="truncate text-[13.5px]">{item.contacto.nombre}</b><small className="shrink-0 text-muted">{hora(item.ultimoMensajeAt)}</small></span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-muted">{item.preview || "Sin mensajes"}</span>
                    {(item.etiquetas.length > 0 || item.estado !== "abierta" || item.responsable || item.requiereAtencion || canales.length > 1) && (
                      <span className="mt-1.5 flex flex-wrap items-center gap-1">
                        {canales.length > 1 && <span className="rounded bg-navy/[.08] px-1.5 py-0.5 text-[10.5px] text-navy">{item.canalNombre}</span>}
                        {item.requiereAtencion && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10.5px] text-amber-700">Por atender</span>}
                        {item.estado !== "abierta" && <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10.5px] text-muted">{item.estado}</span>}
                        {item.etiquetas.slice(0, 3).map((etiqueta) => (
                          <span key={etiqueta.nombre} className="inline-flex items-center gap-1 rounded border border-line bg-paper px-1.5 py-0.5 text-[10.5px]">
                            <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: etiqueta.color }} />{etiqueta.nombre}
                          </span>
                        ))}
                        {item.responsable && <span className="text-[10.5px] text-muted">· {item.responsable.nombre.split(" ")[0]}</span>}
                      </span>
                    )}
                  </span>
                  {item.noLeidos > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1 text-[11px] text-white">{item.noLeidos}</span>}
                </div>
              </button>
            ))}
            {filtradas.length === 0 && <p className="p-8 text-center text-[13px] text-muted">Sin conversaciones.</p>}
          </div>
        </section>

        {/* Conversación */}
        <section className={`${vista === "chat" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col border-line lg:flex xl:border-r`}>
          {seleccionada ? (
            <>
              <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
                <button onClick={() => setVista("lista")} aria-label="Volver a la lista" className="rounded-lg p-1.5 text-muted hover:bg-paper lg:hidden"><ChevronLeft size={20} /></button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-serif text-[17px] leading-tight sm:text-[18px]">{seleccionada.contacto.nombre}</h2>
                  <p className="truncate text-[12px] text-muted">{seleccionada.contacto.telefono} · {seleccionada.canalNombre} · #{seleccionada.numero}</p>
                </div>
                <button onClick={() => setVista("info")} aria-label="Ver detalles" className="rounded-lg border border-line p-1.5 text-muted hover:border-navy/40 xl:hidden"><Info size={18} /></button>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper/50 px-3 py-4 sm:px-4">
                {mensajes.map((mensaje) => {
                  const saliente = mensaje.direccion === "saliente";
                  const estilo = mensaje.privado
                    ? "border border-amber-200 bg-amber-50 text-ink"
                    : saliente
                      ? "bg-navy text-white"
                      : "border border-line bg-surface";
                  return (
                    <div key={mensaje.id} className={`flex ${saliente ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] break-words rounded-xl px-3.5 py-2.5 text-[14px] shadow-sm sm:max-w-[78%] sm:text-[13.5px] ${estilo}`}>
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
              <footer className="shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {!ventanaAbierta && !esNota && <p className="mb-2 text-[12px] text-amber">Ventana de 24 h cerrada: usa una plantilla aprobada o escribe una nota privada.</p>}
                {error && <p className="mb-2 text-[12px] text-danger">{error}</p>}
                <label className="mb-2 flex items-center gap-2 text-[12px] text-muted">
                  <input type="checkbox" checked={esNota} onChange={(event) => setEsNota(event.target.checked)} />
                  Nota privada (solo la ve el equipo)
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setModalPlantilla(true)} className="self-end rounded-lg border border-line px-3 py-2.5 text-[12.5px] hover:border-navy/40">Plantilla</button>
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    disabled={!puedeEscribir}
                    rows={2}
                    placeholder={esNota ? "Escribe una nota interna…" : ventanaAbierta ? "Escribe un mensaje…" : "Solo plantillas fuera de 24 h"}
                    className={`min-w-0 flex-1 resize-none rounded-lg border px-3 py-2 text-[16px] outline-none focus:ring-2 focus:ring-navy/20 disabled:bg-paper sm:text-[13.5px] ${esNota ? "border-amber-300 bg-amber-50" : "border-line"}`}
                  />
                  <button onClick={enviar} disabled={!puedeEscribir || !texto.trim() || enviando} aria-label="Enviar" className="self-end rounded-lg bg-navy p-2.5 text-white disabled:opacity-40"><Send size={18} /></button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[14px] text-muted">Selecciona una conversación.</div>
          )}
        </section>

        {/* Detalles: tercera columna en pantalla ancha; panel que se abre encima en las demás */}
        <aside
          className={`${vista === "info" ? "block" : "hidden"} absolute inset-0 z-20 overflow-y-auto bg-surface lg:left-auto lg:w-[320px] lg:border-l lg:border-line lg:shadow-xl xl:static xl:block xl:min-h-0 xl:w-auto xl:shadow-none`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 xl:hidden">
            <b className="text-[14px]">Detalles</b>
            <button onClick={() => setVista("chat")} className="rounded-lg border border-line px-2.5 py-1 text-[12.5px] hover:border-navy/40">Cerrar</button>
          </div>
          {seleccionada ? (
            <PanelConversacion conversacionId={seleccionada.id} version={versionPanel} onCambio={() => void refrescarVisible()} puedeReasignar={alcance !== "propias"} />
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
    </div>
  );
}
