"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Field, Input } from "@/components/modal";

type Canal = { id: string; nombre: string; telefono: string | null; estado: string; activo: boolean };

export function ConexionManual() {
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [canales, setCanales] = useState<Canal[]>([]);
  const [form, setForm] = useState({ nombre: "", wabaId: "", phoneNumberId: "", token: "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    const response = await fetch("/api/wa/manual", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setCallbackUrl(data.callbackUrl);
    setCanales(data.canales || []);
  }

  useEffect(() => { void cargar(); }, []);

  async function conectar(event: React.FormEvent) {
    event.preventDefault();
    setGuardando(true);
    setMensaje("");
    const response = await fetch("/api/wa/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    setGuardando(false);
    if (!response.ok) return setMensaje(data.error || "No se pudo conectar");
    setForm({ nombre: "", wabaId: "", phoneNumberId: "", token: "" });
    setMensaje("Canal conectado correctamente.");
    await cargar();
  }

  return (
    <Card className="p-5">
      <h2 className="font-serif text-[18px]">Conexión de WhatsApp Cloud API</h2>
      <p className="text-[13px] text-muted mt-1">Conecta WABA ID, Phone Number ID y un token permanente. El token se cifra antes de guardarse.</p>
      <div className="mt-3 rounded-lg bg-paper p-3 text-[12px]">
        <span className="text-muted">Webhook:</span> <code className="break-all">{callbackUrl || "Configura NEXTAUTH_URL"}</code>
      </div>
      {canales.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canales.map((canal) => <span key={canal.id} className="rounded-full bg-success-wash text-success px-3 py-1 text-[12px] font-bold">{canal.nombre} · {canal.telefono || canal.estado}</span>)}
        </div>
      )}
      <form onSubmit={conectar} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <Field label="Nombre del canal"><Input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="WhatsApp despacho" /></Field>
        <Field label="WABA ID"><Input value={form.wabaId} onChange={(event) => setForm({ ...form, wabaId: event.target.value })} required inputMode="numeric" /></Field>
        <Field label="Phone Number ID"><Input value={form.phoneNumberId} onChange={(event) => setForm({ ...form, phoneNumberId: event.target.value })} required inputMode="numeric" /></Field>
        <Field label="Token permanente"><Input value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} required type="password" autoComplete="off" /></Field>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button disabled={guardando} className="rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">{guardando ? "Validando…" : "Conectar"}</button>
          {mensaje && <span className="text-[12px] text-muted">{mensaje}</span>}
        </div>
      </form>
    </Card>
  );
}
