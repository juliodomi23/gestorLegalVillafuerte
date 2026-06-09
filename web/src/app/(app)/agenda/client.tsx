"use client";

import { useState } from "react";
import { CalendarPlus, Phone, Trash2, MessageCircle } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { crearCitaAction, borrarCitaAction } from "./actions";

export type CitaView = {
  id: string;
  hora: string;
  cliente: string;
  asunto: string;
  telefono: string;
  sucursal: string;
  abogado: string;
  estado: string;
};

const vacio = { cliente: "", asunto: "", telefono: "", hora: "", sucursal: "", abogado: "" };

export default function AgendaClient({
  citas,
  sucursales,
  abogados,
}: {
  citas: CitaView[];
  sucursales: string[];
  abogados: string[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  function set(campo: keyof typeof vacio, valor: string) { setForm((f) => ({ ...f, [campo]: valor })); }

  async function borrar(id: string) { if (confirm("¿Cancelar esta cita?")) await borrarCitaAction(id); }
  async function guardar() {
    setSaving(true);
    await crearCitaAction({ cliente: form.cliente, asunto: form.asunto, hora: form.hora, telefono: form.telefono, sucursal: form.sucursal, abogado: form.abogado });
    setSaving(false);
    setForm(vacio);
    setOpen(false);
  }

  const hoyStr = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageTitle eyebrow="Despacho" title="Agenda" subtitle={`Citas del día · ${hoyStr}`} />

      <Card className="overflow-x-auto mt-2">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-serif text-[17px] text-ink">Citas de hoy</h3>
            <p className="text-[12px] text-muted">Agendadas por el bot de atención al cliente</p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
            <CalendarPlus size={18} strokeWidth={1.75} /> Nueva cita
          </button>
        </div>
        <table className="w-full min-w-[820px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Hora</th>
              <th className="eyebrow text-muted px-3 py-3">Cliente</th>
              <th className="eyebrow text-muted px-3 py-3">Asunto</th>
              <th className="eyebrow text-muted px-3 py-3">Teléfono</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Estado</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {citas.map((c) => (
              <tr key={c.id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3.5 num font-bold text-navy">{c.hora}</td>
                <td className="px-3 py-3.5 font-bold">{c.cliente}</td>
                <td className="px-3 py-3.5">{c.asunto}</td>
                <td className="px-3 py-3.5 num text-muted whitespace-nowrap"><Phone size={13} className="inline mr-1" />{c.telefono}</td>
                <td className="px-3 py-3.5 text-muted">{c.sucursal}</td>
                <td className="px-3 py-3.5">{c.abogado}</td>
                <td className="px-3 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${c.estado === "Confirmada" ? "bg-success-wash text-success" : "bg-amber-wash text-amber"}`}>{c.estado}</span>
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button onClick={() => borrar(c.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {citas.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">No hay citas registradas para hoy.</td></tr>}
          </tbody>
        </table>
        <p className="text-[12px] text-muted px-5 py-3 flex items-center gap-1.5">
          <MessageCircle size={13} className="text-success" /> Las citas confirmadas por el bot aparecen aquí automáticamente.
        </p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva cita" onSubmit={guardar} submitLabel={saving ? "Guardando…" : "Agendar cita"}>
        <Field label="Cliente" full><Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nombre del cliente" required /></Field>
        <Field label="Asunto"><Input value={form.asunto} onChange={(e) => set("asunto", e.target.value)} placeholder="Divorcio, consulta…" /></Field>
        <Field label="Hora"><Input type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)} /></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="961 123 4567" /></Field>
        <Field label="Sucursal"><Select options={sucursales} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
        <Field label="Abogado" full><Select options={abogados} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} /></Field>
      </Modal>
    </>
  );
}
