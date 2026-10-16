"use client";

import { AlertCircle, ArrowDown, Bot, Check, CheckCheck, Clock, Lock, MessageCircle, Paperclip, User } from "lucide-react";
import { claveDia, etiquetaDia, horaMensaje } from "@/lib/chat/fechas";
import { agruparMensajes } from "@/lib/chat/agrupacion";
import { useScrollMensajes } from "@/lib/chat/use-scroll-mensajes";
import type { Mensaje } from "./ChatCliente";

function TextoMensaje({ texto }: { texto: string }) {
  return <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{texto.split(/(https?:\/\/[^\s<>]+)/gi).map((parte, indice) => {
    if (!/^https?:\/\//i.test(parte)) return parte;
    const enlace = parte.replace(/[.,;:!?]+$/, "");
    return <span key={indice}><a href={enlace} target="_blank" rel="noopener noreferrer" className="underline decoration-current/50 underline-offset-2">{enlace}</a>{parte.slice(enlace.length)}</span>;
  })}</p>;
}

function Adjunto({ mensaje }: { mensaje: Mensaje }) {
  if (!mensaje.tieneMedia) return null;
  const url = `/api/mensajes/${mensaje.id}/media`;
  const mime = mensaje.mediaMime || "";
  if (mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={mensaje.mediaNombre || "Imagen adjunta"} className="mt-2 max-h-64 max-w-full rounded-lg object-contain" />;
  }
  if (mime.startsWith("audio/")) return <audio aria-label={mensaje.mediaNombre || "Audio adjunto"} controls preload="metadata" src={url} className="mt-2 h-10 w-[260px] max-w-full" />;
  return <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs underline [overflow-wrap:anywhere]"><Paperclip size={14} className="shrink-0" />{mensaje.mediaNombre || "Descargar archivo"}</a>;
}

function EstadoEntrega({ estado }: { estado: string }) {
  const etiquetas: Record<string, string> = { enviado: "Enviado", entregado: "Entregado", leido: "Leído", pendiente: "Pendiente", fallido: "No enviado" };
  const Icono = estado === "leido" || estado === "entregado" ? CheckCheck : estado === "pendiente" ? Clock : estado === "fallido" ? AlertCircle : Check;
  return <span role="img" aria-label={etiquetas[estado] || estado} title={etiquetas[estado] || estado} className={estado === "leido" ? "text-sky-300" : ""}><Icono size={15} strokeWidth={2} /></span>;
}

export function EsqueletoChat({ lista = false }: { lista?: boolean }) {
  return <div role="status" aria-label={lista ? "Cargando conversaciones" : "Cargando mensajes"} className="space-y-4 p-4 motion-safe:animate-pulse">
    {Array.from({ length: lista ? 6 : 4 }, (_, indice) => <div key={indice} aria-hidden="true" className={`flex gap-3 ${!lista && indice % 2 ? "justify-end" : ""}`}>
      {lista && <span className="h-10 w-10 shrink-0 rounded-full bg-line/60" />}
      <div className={`space-y-2 rounded-xl bg-line/40 p-3 ${lista ? "flex-1" : "w-2/3"}`}><div className="h-3 w-2/3 rounded bg-line" /><div className="h-3 w-full rounded bg-line/70" /></div>
    </div>)}
  </div>;
}

export function MensajesConversacion({ conversacionId, mensajes, cargados, vista, error }: {
  conversacionId: string; mensajes: Mensaje[]; cargados: boolean; vista: string; error: string;
}) {
  const scroll = useScrollMensajes(conversacionId, mensajes, cargados, vista);
  const dias: { clave: string; fecha: Date; grupos: Mensaje[][] }[] = [];
  for (const grupo of agruparMensajes(mensajes)) {
    const fecha = new Date(grupo[0].timestamp);
    const clave = claveDia(fecha);
    if (dias[dias.length - 1]?.clave !== clave) dias.push({ clave, fecha, grupos: [] });
    dias[dias.length - 1].grupos.push(grupo);
  }

  return <div className="relative min-h-0 flex-1">
    <div ref={scroll.zona} onScroll={scroll.alDesplazar} onLoadCapture={scroll.ajustar} onLoadedMetadataCapture={scroll.ajustar}
      tabIndex={0} aria-label="Mensajes de la conversación" aria-busy={!cargados && !error}
      className="chat-mensajes h-full overflow-y-auto overscroll-contain px-3 pb-4 sm:px-5 [overflow-anchor:none]">
      <div ref={scroll.contenido} className="mx-auto max-w-[920px]">
        {error && <p role="alert" className="my-3 rounded-lg bg-danger-wash p-3 text-sm text-danger">{error}</p>}
        {!cargados && !error ? <EsqueletoChat /> : !mensajes.length && !error ? <div className="flex flex-col items-center gap-2 py-16 text-center text-muted"><MessageCircle size={32} /><p className="text-sm">Todavía no hay mensajes</p><p className="text-xs">El historial aparecerá aquí.</p></div> : null}
        {dias.map((dia) => <section key={dia.clave} aria-label={etiquetaDia(dia.fecha)} className="pb-3">
          <div className="sticky top-0 z-10 flex justify-center py-3 pointer-events-none"><span className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold text-muted shadow-sm">{etiquetaDia(dia.fecha)}</span></div>
          <div className="space-y-3">{dia.grupos.map((grupo) => <div key={grupo[0].id} className="space-y-1">
            {grupo.map((mensaje, indice) => {
              const saliente = mensaje.direccion === "saliente";
              const ultimo = indice === grupo.length - 1;
              const estilo = mensaje.privado ? "chat-nota border border-amber/20 bg-amber-wash text-ink" : saliente ? "bg-navy text-white" : "border border-line bg-surface text-ink";
              return <div key={mensaje.id} data-mensaje-id={mensaje.id} className={`flex ${saliente ? "justify-end" : "justify-start"}`}>
                <div className={`min-w-0 max-w-[88%] rounded-2xl px-3 py-2 text-[14px] leading-relaxed shadow-sm sm:max-w-[80%] xl:max-w-[75%] ${ultimo ? saliente ? "rounded-br-sm" : "rounded-bl-sm" : ""} ${estilo}`}>
                  {saliente && <p className={`mb-1 flex items-center gap-1 text-[11px] font-semibold ${mensaje.privado ? "text-amber" : "text-white/80"}`}>
                    {mensaje.esBot ? <Bot size={12} /> : <User size={12} />}{mensaje.esBot ? "Bot" : mensaje.remitente}
                  </p>}
                  {mensaje.privado && <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber"><Lock size={12} />Nota privada · solo equipo</p>}
                  {(mensaje.contenido || !mensaje.tieneMedia) && <TextoMensaje texto={mensaje.contenido || `[${mensaje.tipo}]`} />}
                  <Adjunto mensaje={mensaje} />
                  {(ultimo || (saliente && !mensaje.privado)) && <div className={`mt-1 flex min-h-4 items-center justify-end gap-1.5 text-[10.5px] ${saliente && !mensaje.privado ? "text-white/85" : "text-muted"}`}>
                    {ultimo && <time dateTime={mensaje.timestamp}>{horaMensaje(mensaje.timestamp)}</time>}
                    {saliente && !mensaje.privado && <EstadoEntrega estado={mensaje.status} />}
                  </div>}
                  {mensaje.errorDetalle && <p role="alert" className={`mt-1.5 flex items-start gap-1.5 border-t pt-1.5 text-[11px] leading-snug [overflow-wrap:anywhere] ${saliente && !mensaje.privado ? "border-white/20 text-white" : "border-danger/20 text-danger"}`}><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{mensaje.errorDetalle}</span></p>}
                </div>
              </div>;
            })}
          </div>)}</div>
        </section>)}
      </div>
    </div>
    {scroll.nuevos > 0 && <button onClick={scroll.bajarAlFinal} className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-navy shadow-lg"><ArrowDown size={16} /><span aria-live="polite">{scroll.nuevos} {scroll.nuevos === 1 ? "nuevo" : "nuevos"}</span></button>}
  </div>;
}
