"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, MessageCircle, Send, Search } from "lucide-react";
import { Card } from "@/components/ui";
import { estadoVentana } from "@/lib/meta/ventana";
import { pollingPermitido } from "@/lib/chat/polling";
import { PanelConversacion } from "./PanelConversacion";
import { EnviarPlantilla } from "./EnviarPlantilla";

export type ConversacionItem = {
  id: string;
  contacto: { nombre: string; telefono: string };
  noLeidos: number;
  ultimoMensajeAt: string | null;
  preview: string;
  estado: string;
  canalId: string;
  canalNombre: string;
  canalActivo: boolean;
  vinculo: { tipo: "cliente" | "prospecto"; id: string; nombre: string } | null;
};

type Mensaje = {
  id: string;
  direccion: "entrante" | "saliente";
  tipo: string;
  contenido: string | null;
  status: string;
  errorDetalle: string | null;
  timestamp: string;
};

function hora(fecha: string | null) {
  return fecha ? new Date(fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
}

export function ChatCliente() {
  const [conversaciones, setConversaciones] = useState<ConversacionItem[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
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
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return termino
      ? conversaciones.filter((item) => `${item.contacto.nombre} ${item.contacto.telefono}`.toLowerCase().includes(termino))
      : conversaciones;
  }, [busqueda, conversaciones]);
  const ultimoEntrante = [...mensajes].reverse().find((mensaje) => mensaje.direccion === "entrante")?.timestamp;
  const ventanaAbierta = estadoVentana(ultimoEntrante).abierta;

  async function enviar() {
    if (!seleccionadaId || !texto.trim()) return;
    setEnviando(true);
    setError("");
    const response = await fetch("/api/mensajes/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversacionId: seleccionadaId, texto }),
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

  return (
    <Card className="overflow-hidden min-h-[650px]">
      <div className="grid min-h-[650px] xl:grid-cols-[300px_minmax(0,1fr)_280px]">
        <section className="border-b border-line xl:border-b-0 xl:border-r">
          <div className="p-3 border-b border-line">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar conversación…"
                className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
          </div>
          <div className="max-h-[590px] overflow-y-auto divide-y divide-line/70">
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
                <p className="text-[12px] text-muted">{seleccionada.contacto.telefono} · {seleccionada.canalNombre}</p>
              </header>
              <div className="flex-1 overflow-y-auto bg-paper/50 px-4 py-5 space-y-3 max-h-[500px]">
                {mensajes.map((mensaje) => (
                  <div key={mensaje.id} className={`flex ${mensaje.direccion === "saliente" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-[13.5px] shadow-sm ${mensaje.direccion === "saliente" ? "bg-navy text-white" : "bg-surface border border-line"}`}>
                      <p className="whitespace-pre-wrap">{mensaje.contenido || `[${mensaje.tipo}]`}</p>
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mensaje.direccion === "saliente" ? "text-white/60" : "text-muted"}`}>
                        {hora(mensaje.timestamp)}
                        {mensaje.direccion === "saliente" && <CheckCheck size={12} className={mensaje.status === "leido" ? "text-sky-300" : ""} />}
                      </div>
                      {mensaje.errorDetalle && <p className="mt-1 text-[11px] text-danger">{mensaje.errorDetalle}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <footer className="border-t border-line p-3">
                {!ventanaAbierta && <p className="mb-2 text-[12px] text-amber">Ventana de 24 h cerrada: usa una plantilla aprobada.</p>}
                {error && <p className="mb-2 text-[12px] text-danger">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setModalPlantilla(true)} className="px-3 py-2 rounded-lg border border-line text-[12.5px] hover:border-navy/40">Plantilla</button>
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    disabled={!ventanaAbierta}
                    rows={2}
                    placeholder={ventanaAbierta ? "Escribe un mensaje…" : "Solo plantillas fuera de 24 h"}
                    className="flex-1 resize-none rounded-lg border border-line px-3 py-2 text-[13.5px] outline-none focus:ring-2 focus:ring-navy/20 disabled:bg-paper"
                  />
                  <button onClick={enviar} disabled={!ventanaAbierta || !texto.trim() || enviando} aria-label="Enviar" className="self-end p-2.5 rounded-lg bg-navy text-white disabled:opacity-40"><Send size={18} /></button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted text-[14px]">Selecciona una conversación.</div>
          )}
        </section>

        <aside className="min-h-[300px]">
          {seleccionada ? <PanelConversacion conversacionId={seleccionada.id} version={versionPanel} /> : null}
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
