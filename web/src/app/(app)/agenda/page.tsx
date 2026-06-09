"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Phone, CalendarPlus, Trash2 } from "lucide-react";
import { SUCURSALES, ABOGADOS } from "@/lib/mock";
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";

type Evento = { hora?: string; titulo: string; sub?: string; tipo: "audiencia" | "cita" | "vencimiento" };

const semana: { dia: string; hoy?: boolean; eventos: Evento[] }[] = [
  { dia: "Lun 8", eventos: [{ titulo: "Vence: ofrecer pruebas", sub: "EXP-0098", tipo: "vencimiento" }] },
  { dia: "Mar 9", hoy: true, eventos: [
    { hora: "10:00", titulo: "Audiencia", sub: "EXP-0142", tipo: "audiencia" },
    { hora: "12:30", titulo: "Audiencia", sub: "EXP-0077", tipo: "audiencia" },
    { hora: "15:00", titulo: "Cita · M. López", tipo: "cita" },
    { hora: "16:00", titulo: "Alegatos", sub: "EXP-0051", tipo: "audiencia" },
  ]},
  { dia: "Mié 10", eventos: [
    { titulo: "Vence: contestar demanda", sub: "EXP-0142", tipo: "vencimiento" },
    { hora: "11:00", titulo: "Cita · nuevo cliente", tipo: "cita" },
  ]},
  { dia: "Jue 11", eventos: [{ hora: "17:00", titulo: "Cita · P. Ramírez", tipo: "cita" }] },
  { dia: "Vie 12", eventos: [{ hora: "09:30", titulo: "Audiencia", sub: "EXP-0410", tipo: "audiencia" }] },
];

const estilo: Record<Evento["tipo"], string> = {
  audiencia: "border-navy bg-navy/[.04]",
  cita: "border-amber-soft bg-amber-wash/40",
  vencimiento: "border-danger bg-danger-wash/40",
};

type Cita = { hora: string; cliente: string; asunto: string; tel: string; sucursal: string; abogado: string; estado: string };

const inicialesCitas: Cita[] = [
  { hora: "15:00", cliente: "María López", asunto: "Divorcio", tel: "961 555 1212", sucursal: "Tuxtla", abogado: "Christian", estado: "Confirmada" },
  { hora: "11:00", cliente: "Nuevo cliente", asunto: "Consulta laboral", tel: "961 222 8080", sucursal: "Tapachula", abogado: "Ana", estado: "Por confirmar" },
  { hora: "17:00", cliente: "Pedro Ramírez", asunto: "Pagaré", tel: "961 333 9090", sucursal: "Comitán", abogado: "Christian", estado: "Confirmada" },
];

const vacio = { cliente: "", asunto: "", tel: "", hora: "", sucursal: "", abogado: "" };

export default function AgendaPage() {
  const [citas, setCitas] = useState<Cita[]>(inicialesCitas);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vacio);

  function set(campo: keyof typeof vacio, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function guardar() {
    const nueva: Cita = {
      hora: form.hora || "—",
      cliente: form.cliente,
      asunto: form.asunto,
      tel: form.tel || "—",
      sucursal: form.sucursal || "Tuxtla",
      abogado: form.abogado || "Christian",
      estado: "Por confirmar",
    };
    setCitas((c) => [...c, nueva].sort((a, b) => a.hora.localeCompare(b.hora)));
    setForm(vacio);
    setOpen(false);
  }

  function borrarCita(i: number) {
    if (confirm("¿Cancelar esta cita?")) setCitas((c) => c.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <PageTitle eyebrow="Despacho" title="Agenda" subtitle="Audiencias, citas y vencimientos · semana del 8 al 14 de junio" />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors"><ChevronLeft size={16} /> Anterior</button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors">Siguiente <ChevronRight size={16} /></button>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted"><span className="w-2.5 h-2.5 rounded-sm bg-navy" /> Audiencia</span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted ml-3"><span className="w-2.5 h-2.5 rounded-sm bg-amber-soft" /> Cita</span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted ml-3"><span className="w-2.5 h-2.5 rounded-sm bg-danger" /> Vencimiento</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {semana.map((d) => (
          <Card key={d.dia} className={`p-3 min-h-[220px] ${d.hoy ? "border-2 border-navy/30" : ""}`}>
            <p className={`eyebrow mb-2 ${d.hoy ? "text-navy" : "text-muted"}`}>{d.dia}{d.hoy ? " · hoy" : ""}</p>
            {d.eventos.map((e, i) => (
              <div key={i} className={`rounded-lg border-l-[3px] px-2.5 py-2 mb-2 text-[12px] ${estilo[e.tipo]}`}>
                {e.hora && <b className="num">{e.hora} </b>}
                {e.tipo === "vencimiento" ? <b>{e.titulo}</b> : e.titulo}
                {e.sub && <><br /><span className="exp-no text-muted">{e.sub}</span></>}
              </div>
            ))}
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto mt-6">
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
            {citas.map((c, i) => (
              <tr key={i} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3.5 num font-bold text-navy">{c.hora}</td>
                <td className="px-3 py-3.5 font-bold">{c.cliente}</td>
                <td className="px-3 py-3.5">{c.asunto}</td>
                <td className="px-3 py-3.5 num text-muted whitespace-nowrap"><Phone size={13} className="inline mr-1" />{c.tel}</td>
                <td className="px-3 py-3.5 text-muted">{c.sucursal}</td>
                <td className="px-3 py-3.5">{c.abogado}</td>
                <td className="px-3 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${c.estado === "Confirmada" ? "bg-success-wash text-success" : "bg-amber-wash text-amber"}`}>{c.estado}</span>
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button onClick={() => borrarCita(i)} title="Cancelar cita" className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva cita" onSubmit={guardar} submitLabel="Agendar cita">
        <Field label="Cliente" full>
          <Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nombre del cliente" required />
        </Field>
        <Field label="Asunto">
          <Input value={form.asunto} onChange={(e) => set("asunto", e.target.value)} placeholder="Divorcio, consulta…" />
        </Field>
        <Field label="Hora">
          <Input type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)} />
        </Field>
        <Field label="Teléfono">
          <Input value={form.tel} onChange={(e) => set("tel", e.target.value)} placeholder="961 123 4567" />
        </Field>
        <Field label="Sucursal">
          <Select options={SUCURSALES} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} />
        </Field>
        <Field label="Abogado" full>
          <Select options={ABOGADOS} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
