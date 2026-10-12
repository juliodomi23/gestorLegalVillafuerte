"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";

type Token = { id: string; nombre: string; tokenPrefijo: string; activo: boolean; ultimoUsoEn: string | null; revocadoEn: string | null; creadoEn: string };
type Webhook = { id: string; nombre: string; url: string; eventos: string[]; activo: boolean; tieneSecreto: boolean };

const fecha = (valor: string | null) => (valor ? new Date(valor).toLocaleString("es-MX") : "nunca");

// Los valores secretos (token y secreto de firma) se muestran una sola vez.
export function IntegracionesChat() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [nombreToken, setNombreToken] = useState("");
  const [webhook, setWebhook] = useState({ nombre: "", url: "" });
  const [secreto, setSecreto] = useState<{ etiqueta: string; valor: string } | null>(null);
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    const [t, w] = await Promise.all([
      fetch("/api/chat/tokens", { cache: "no-store" }),
      fetch("/api/chat/webhooks", { cache: "no-store" }),
    ]);
    if (t.ok) setTokens((await t.json()).tokens || []);
    if (w.ok) setWebhooks((await w.json()).webhooks || []);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function llamar(url: string, metodo: string, cuerpo?: unknown) {
    setMensaje("");
    const response = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMensaje(data.error || "No se pudo completar la acción");
    return response.ok ? data : null;
  }

  async function crearToken(event: React.FormEvent) {
    event.preventDefault();
    const data = await llamar("/api/chat/tokens", "POST", { nombre: nombreToken });
    if (!data) return;
    setNombreToken("");
    setSecreto({ etiqueta: "Token de API (cópialo ahora, no se vuelve a mostrar)", valor: data.valor });
    await cargar();
  }

  async function crearWebhook(event: React.FormEvent) {
    event.preventDefault();
    const data = await llamar("/api/chat/webhooks", "POST", webhook);
    if (!data) return;
    setWebhook({ nombre: "", url: "" });
    setSecreto({ etiqueta: "Secreto de firma del webhook (cópialo ahora, no se vuelve a mostrar)", valor: data.secreto });
    await cargar();
  }

  const campo = "rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-navy/20";

  return (
    <Card className="p-5 mt-5">
      <h3 className="font-serif text-[18px]">Integraciones del chat (bots y n8n)</h3>
      <p className="mt-1 text-[12.5px] text-muted">
        Tokens para la API <code>/api/v1</code> compatible con Chatwoot y webhooks salientes hacia n8n.
      </p>
      {mensaje && <p className="mt-3 text-[12.5px] text-danger">{mensaje}</p>}
      {secreto && (
        <div className="mt-3 rounded-lg border border-amber/40 bg-amber-50 p-3 text-[12.5px]">
          <p className="font-semibold">{secreto.etiqueta}</p>
          <code className="mt-1 block break-all select-all">{secreto.valor}</code>
          <button onClick={() => setSecreto(null)} className="mt-2 underline">Ya lo guardé</button>
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section>
          <h4 className="text-[13.5px] font-semibold">Tokens de API</h4>
          <form onSubmit={crearToken} className="mt-2 flex gap-2">
            <input value={nombreToken} onChange={(e) => setNombreToken(e.target.value)} placeholder="Nombre (p. ej. n8n)" className={`${campo} flex-1`} required />
            <button className="rounded-lg bg-navy px-3 py-2 text-[13px] text-white">Crear</button>
          </form>
          <ul className="mt-3 space-y-2 text-[12.5px]">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-2.5">
                <span className="min-w-0">
                  <b>{token.nombre}</b> <span className="text-muted">({token.tokenPrefijo}…)</span>
                  <span className="block text-muted">Último uso: {fecha(token.ultimoUsoEn)}{token.revocadoEn ? " · revocado" : ""}</span>
                </span>
                {token.activo && !token.revocadoEn && (
                  <button onClick={async () => { if (await llamar(`/api/chat/tokens/${token.id}`, "DELETE")) await cargar(); }} className="text-danger underline">Revocar</button>
                )}
              </li>
            ))}
            {tokens.length === 0 && <li className="text-muted">Sin tokens.</li>}
          </ul>
        </section>

        <section>
          <h4 className="text-[13.5px] font-semibold">Webhooks salientes</h4>
          <form onSubmit={crearWebhook} className="mt-2 space-y-2">
            <input value={webhook.nombre} onChange={(e) => setWebhook({ ...webhook, nombre: e.target.value })} placeholder="Nombre (p. ej. Asistente Principal)" className={`${campo} w-full`} required />
            <div className="flex gap-2">
              <input value={webhook.url} onChange={(e) => setWebhook({ ...webhook, url: e.target.value })} placeholder="https://n8n…/webhook/…" className={`${campo} flex-1`} required />
              <button className="rounded-lg bg-navy px-3 py-2 text-[13px] text-white">Agregar</button>
            </div>
          </form>
          <ul className="mt-3 space-y-2 text-[12.5px]">
            {webhooks.map((item) => (
              <li key={item.id} className="rounded-lg border border-line p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <b className="truncate">{item.nombre}</b>
                  <span className="flex shrink-0 gap-3">
                    <button onClick={async () => { if (await llamar(`/api/chat/webhooks/${item.id}`, "PATCH", { activo: !item.activo })) await cargar(); }} className="underline">{item.activo ? "Desactivar" : "Activar"}</button>
                    <button onClick={async () => { if (await llamar(`/api/chat/webhooks/${item.id}`, "DELETE")) await cargar(); }} className="text-danger underline">Eliminar</button>
                  </span>
                </div>
                <span className="block truncate text-muted">{item.url}</span>
                <span className="block text-muted">{item.activo ? "Activo" : "Inactivo"} · {item.eventos.length} eventos</span>
              </li>
            ))}
            {webhooks.length === 0 && <li className="text-muted">Sin webhooks.</li>}
          </ul>
        </section>
      </div>
    </Card>
  );
}
