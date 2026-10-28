"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, Info, Lock, MessageCircle, Search, Send } from "lucide-react";
import { estadoVentana } from "@/lib/meta/ventana";
import { pollingPermitido } from "@/lib/chat/polling";
import { useAltoDisponible } from "@/lib/chat/use-alto";
import { fechaConversacion } from "@/lib/chat/fechas";
import type { Alcance } from "@/lib/chat/alcance";
import { PanelConversacion } from "./PanelConversacion";
import { EnviarPlantilla } from "./EnviarPlantilla";
import { AvatarContacto } from "./AvatarContacto";
import { EsqueletoChat, MensajesConversacion } from "./MensajesConversacion";

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
  etapa: { id: string; nombre: string; color: string } | null;
  requiereAtencion: boolean;
  vinculo: { tipo: "cliente" | "prospecto"; id: string; nombre: string } | null;
};

export type Mensaje = {
  id: string;
  direccion: "entrante" | "saliente";
  esBot: boolean;
  remitente: string | null;
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

export function ChatCliente({
  usuarioId,
  alcance,
  conversacionInicial,
}: {
  usuarioId: string;
  alcance: Alcance;
  conversacionInicial?: number;
}) {
  const [conversaciones, setConversaciones] = useState<ConversacionItem[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [historial, setHistorial] = useState<{ id: string; mensajes: Mensaje[] } | null>(null);
  const [listaCargada, setListaCargada] = useState(false);
  const [errorLista, setErrorLista] = useState("");
  const [errorHistorial, setErrorHistorial] = useState<{ id: string; texto: string } | null>(null);
  const [ultimosConocidos, setUltimosConocidos] = useState<Record<string, Mensaje>>({});
  const [busqueda, setBusqueda] = useState("");
  const [terminoServidor, setTerminoServidor] = useState("");
  const [total, setTotal] = useState(0);
  const [pestana, setPestana] = useState<Pestana>(alcance === "propias" ? "por_atender" : "todas");
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
  const { raiz, alto } = useAltoDisponible();
  const abiertaDesdeEmbudo = useRef(false);
  const seleccionadaRef = useRef<string | null>(null);
  const solicitudMensajes = useRef(0);
  const respuestaAplicada = useRef(0);
  const solicitudLista = useRef(0);
  const compositor = useRef<HTMLTextAreaElement>(null);
  seleccionadaRef.current = seleccionadaId;
  const mensajesCargados = historial?.id === seleccionadaId;
  const mensajes = useMemo(() => mensajesCargados ? historial!.mensajes : [], [historial, mensajesCargados]);

  useLayoutEffect(() => {
    const campo = compositor.current;
    if (!campo) return;
    campo.style.height = "auto";
    campo.style.height = `${Math.min(campo.scrollHeight, 136)}px`;
  }, [texto, seleccionadaId, vista]);

  useEffect(() => {
    const espera = window.setTimeout(() => setTerminoServidor(busqueda.trim()), 350);
    return () => window.clearTimeout(espera);
  }, [busqueda]);

  const cargarConversaciones = useCallback(async () => {
    const solicitud = ++solicitudLista.current;
    const params = new URLSearchParams();
    if (terminoServidor) params.set("q", terminoServidor);
    if (conversacionInicial) params.set("c", String(conversacionInicial));
    let data;
    try {
      const response = await fetch(`/api/conversaciones?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron cargar las conversaciones. Reintentando…");
      data = await response.json();
    } catch {
      if (solicitud === solicitudLista.current) setErrorLista("No se pudieron cargar las conversaciones. Reintentando…");
      return;
    }
    if (solicitud !== solicitudLista.current) return;
    setListaCargada(true);
    setErrorLista("");
    const nuevas: ConversacionItem[] = data.conversaciones || [];
    setConversaciones(nuevas);
    setTotal(Number(data.total) || nuevas.length);
    const pedida = conversacionInicial ? nuevas.find((item) => item.numero === conversacionInicial) : undefined;
    setSeleccionadaId((actual) => actual || pedida?.id || nuevas[0]?.id || null);
    if (pedida && !abiertaDesdeEmbudo.current) {
      abiertaDesdeEmbudo.current = true;
      setVista("chat");
    }
  }, [conversacionInicial, terminoServidor]);

  const cargarMensajes = useCallback(async (id: string) => {
    const solicitud = ++solicitudMensajes.current;
    try {
      const response = await fetch(`/api/conversaciones/${id}/mensajes`, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron cargar los mensajes");
      const data = await response.json();
      if (seleccionadaRef.current !== id || solicitud < respuestaAplicada.current) return;
      respuestaAplicada.current = solicitud;
      const nuevos: Mensaje[] = data.mensajes || [];
      setHistorial({ id, mensajes: nuevos });
      setErrorHistorial(null);
      if (nuevos.length) setUltimosConocidos((actual) => ({ ...actual, [id]: nuevos[nuevos.length - 1] }));
    } catch {
      if (seleccionadaRef.current === id && solicitud >= respuestaAplicada.current) {
        setErrorHistorial({ id, texto: "No se pudieron cargar los mensajes. Reintentando…" });
      }
    }
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
    setError("");
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
      todas: Math.max(total, conversaciones.length),
      mias: conversaciones.filter((item) => item.responsable?.id === usuarioId).length,
      sin_asignar: conversaciones.filter((item) => !item.responsable).length,
    }),
    [conversaciones, total, usuarioId],
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
    if (!seleccionadaId || !texto.trim() || !puedeEscribir || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const response = await fetch("/api/mensajes/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacionId: seleccionadaId, texto, privado: esNota }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "No se pudo enviar");
        if (data.ventanaCerrada) setModalPlantilla(true);
        return;
      }
      setTexto("");
      await refrescarVisible();
    } catch {
      setError("No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const pestanas: { id: Pestana; texto: string }[] =
    alcance === "propias"
      ? []
      : [
          { id: "por_atender", texto: "Por atender" },
          { id: "mias", texto: "Mías" },
          { id: "sin_asignar", texto: "Sin asignar" },
          { id: "todas", texto: "Todas" },
        ];

  const campoFiltro =
    "min-w-[calc(50%-0.25rem)] flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-[16px] sm:text-[12px]";

  return (
    <div
      ref={raiz}
      style={alto ? { height: alto } : undefined}
      className="chat-cliente relative flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-card"
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
                  className={`flex min-w-0 flex-1 shrink-0 flex-col items-center gap-0.5 whitespace-nowrap px-2 py-2 transition-colors ${pestana === item.id ? "border-b-2 border-navy font-semibold text-navy" : "text-muted hover:text-ink"}`}
                >
                  <span>{item.texto}</span><span className="text-[10.5px] text-muted">{conteos[item.id].toLocaleString("es-MX")}</span>
                </button>
              ))}
            </div>
          )}
          <div className="shrink-0 space-y-2 border-b border-line p-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={busqueda}
                aria-label="Buscar conversación"
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar conversación…"
                className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-[16px] outline-none focus:ring-2 focus:ring-navy/20 sm:text-[13px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {canales.length > 1 && (
                <select aria-label="Filtrar por número" value={filtroCanal} onChange={(event) => setFiltroCanal(event.target.value)} className={campoFiltro}>
                  <option value="">Todos los números</option>
                  {canales.map((canal) => <option key={canal.id} value={canal.id}>{canal.nombre}</option>)}
                </select>
              )}
              <select aria-label="Filtrar por estado" value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)} className={campoFiltro}>
                {ESTADOS.map((estado) => <option key={estado.valor} value={estado.valor}>{estado.texto}</option>)}
              </select>
              <select aria-label="Filtrar por etiqueta" value={filtroEtiqueta} onChange={(event) => setFiltroEtiqueta(event.target.value)} className={campoFiltro}>
                <option value="">Todas las etiquetas</option>
                {etiquetasDisponibles.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </div>
          </div>
          <div aria-label="Conversaciones" aria-busy={!listaCargada && !errorLista} className="min-h-0 flex-1 divide-y divide-line/70 overflow-y-auto overscroll-contain">
            {errorLista && <p role="alert" className="p-4 text-xs text-danger">{errorLista}</p>}
            {!listaCargada && !errorLista && <EsqueletoChat lista />}
            {filtradas.map((item) => (
              <button
                key={item.id}
                aria-pressed={item.id === seleccionadaId}
                onClick={() => {
                  setSeleccionadaId(item.id);
                  setVista("chat");
                }}
                className={`w-full border-l-[3px] px-3 py-3 text-left transition-colors ${item.id === seleccionadaId ? "border-l-navy bg-navy/[.07]" : "border-l-transparent hover:bg-paper"}`}
              >
                <div className="flex items-start gap-3">
                  <AvatarContacto nombre={item.contacto.nombre} telefono={item.contacto.telefono} />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2"><b className="truncate text-[14px]">{item.contacto.nombre}</b><small className={`shrink-0 text-[10.5px] ${item.noLeidos ? "font-semibold text-success" : "text-muted"}`}>{fechaConversacion(item.ultimoMensajeAt)}</small></span>
                    <span className="mt-1 flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{ultimosConocidos[item.id]?.direccion === "saliente" && item.ultimoMensajeAt && new Date(ultimosConocidos[item.id].timestamp).getTime() === new Date(item.ultimoMensajeAt).getTime() ? "Tú: " : ""}{item.preview || "Sin mensajes"}</span>
                      {item.noLeidos > 0 && <span aria-label={`${item.noLeidos} mensajes no leídos`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-success px-1.5 text-[10.5px] font-semibold text-white">{item.noLeidos}</span>}
                    </span>
                    {(item.etiquetas.length > 0 || item.estado !== "abierta" || item.responsable || item.requiereAtencion || item.etapa || canales.length > 1) && (
                      <span className="mt-1.5 flex flex-wrap items-center gap-1">
                        {canales.length > 1 && <span className="rounded bg-navy/[.08] px-1.5 py-0.5 text-[10.5px] text-navy">{item.canalNombre}</span>}
                        {item.etapa && (
                          <span className="inline-flex items-center gap-1 rounded bg-navy/[.06] px-1.5 py-0.5 text-[10.5px] text-ink">
                            <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.etapa.color }} />{item.etapa.nombre}
                          </span>
                        )}
                        {item.requiereAtencion && <span className="rounded bg-amber-wash px-1.5 py-0.5 text-[10.5px] font-semibold text-amber">Por atender</span>}
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
                </div>
              </button>
            ))}
            {listaCargada && filtradas.length === 0 && <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-muted"><MessageCircle size={28} /><p className="text-sm">{busqueda ? "Sin coincidencias" : "Sin conversaciones"}</p><p className="text-xs">{busqueda ? "Prueba con otro nombre o teléfono." : "Las conversaciones aparecerán aquí."}</p></div>}
          </div>
        </section>

        {/* Conversación */}
        <section className={`${vista === "chat" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col border-line lg:flex xl:border-r`}>
          {seleccionada ? (
            <>
              <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
                <button onClick={() => setVista("lista")} aria-label="Volver a la lista" className="rounded-lg p-2 text-navy hover:bg-paper lg:hidden"><ChevronLeft size={22} /></button>
                <span className="hidden sm:inline-flex"><AvatarContacto nombre={seleccionada.contacto.nombre} telefono={seleccionada.contacto.telefono} /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-semibold leading-tight sm:text-[16px]">{seleccionada.contacto.nombre}</h2>
                  <p className="truncate text-[12px] text-muted">{seleccionada.contacto.telefono} · {seleccionada.canalNombre} · #{seleccionada.numero}</p>
                  <p className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted">
                    {seleccionada.etapa && <span className="inline-flex min-w-0 items-center gap-1 rounded bg-paper px-1.5 py-0.5 text-ink"><i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: seleccionada.etapa.color }} /><span className="truncate">{seleccionada.etapa.nombre}</span></span>}
                    <span className="truncate" title={seleccionada.responsable?.nombre}>Asignada: {seleccionada.responsable?.nombre || "sin asignar"}</span>
                  </p>
                </div>
                <button onClick={() => setVista("info")} aria-label="Ver detalles" className="rounded-lg border border-line p-1.5 text-muted hover:border-navy/40 xl:hidden"><Info size={18} /></button>
              </header>
              <MensajesConversacion conversacionId={seleccionada.id} mensajes={mensajes} cargados={mensajesCargados} vista={vista} error={errorHistorial?.id === seleccionada.id ? errorHistorial.texto : ""} />
              <footer className="shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {mensajesCargados && !ventanaAbierta && !esNota && <div className="mb-2 flex items-center gap-2 rounded-lg bg-amber-wash px-3 py-2 text-[12px] text-amber"><Lock size={15} className="shrink-0" /><p className="min-w-0 flex-1">Pasaron 24 h desde el último mensaje del contacto. Retoma con una plantilla aprobada.</p><button onClick={() => setModalPlantilla(true)} className="shrink-0 rounded-md border border-amber/30 px-2 py-1 font-semibold">Usar plantilla</button></div>}
                {error && <p role="alert" className="mb-2 flex items-start gap-1.5 text-[12px] text-danger"><AlertCircle size={14} className="shrink-0" />{error}</p>}
                <label className="mb-2 flex items-center gap-2 text-[12px] text-muted">
                  <input type="checkbox" checked={esNota} onChange={(event) => setEsNota(event.target.checked)} />
                  <Lock size={12} /> Nota privada · solo equipo
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setModalPlantilla(true)} className="self-end rounded-lg border border-line px-3 py-2.5 text-[12.5px] hover:border-navy/40">Plantilla</button>
                  <textarea
                    ref={compositor}
                    aria-label={esNota ? "Nota privada" : "Escribe un mensaje"}
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    disabled={!puedeEscribir || !mensajesCargados || enviando}
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        void enviar();
                      }
                    }}
                    placeholder={esNota ? "Escribe una nota interna…" : ventanaAbierta ? "Escribe un mensaje…" : "Solo plantillas fuera de 24 h"}
                    className={`max-h-[136px] min-h-11 min-w-0 flex-1 resize-none rounded-xl border px-3 py-2.5 text-[16px] leading-[22px] outline-none disabled:bg-paper sm:text-[14px] ${esNota ? "chat-nota border-amber/30 bg-amber-wash" : "border-line bg-paper/50"}`}
                  />
                  <button onClick={() => void enviar()} disabled={!puedeEscribir || !mensajesCargados || !texto.trim() || enviando} aria-label={enviando ? "Enviando" : "Enviar"} className="self-end rounded-xl bg-navy p-3 text-white disabled:cursor-not-allowed disabled:opacity-40"><Send size={18} /></button>
                </div>
              </footer>
            </>
          ) : (
            <div className="chat-mensajes flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted"><MessageCircle size={40} strokeWidth={1.5} /><p className="text-[16px] font-semibold text-ink">Tu espacio de conversación</p><p className="max-w-60 text-sm">Selecciona un contacto para ver su historial y continuar la conversación.</p></div>
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
            <PanelConversacion key={seleccionada.id} conversacionId={seleccionada.id} version={versionPanel} onCambio={() => void refrescarVisible()} puedeReasignar={alcance !== "propias"} />
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
