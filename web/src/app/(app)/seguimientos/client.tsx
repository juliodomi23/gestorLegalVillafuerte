"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Phone, MessageCircle, PhoneCall } from "lucide-react";
import { PageTitle, Card, FilterSelect, SearchBox } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { crearSeguimientoAction, editarSeguimientoAction, marcarLlamadoAction, borrarSeguimientoAction } from "./actions";

export type SeguimientoView = {
  id: string;
  cliente: string;
  tipoCaso: string;
  abogado: string;
  sucursal: string;
  telefono: string;
  ultimoContacto: string;
  proximoLlamado: string;
  frecuencia: number;
  alerta: "hoy" | "atrasado" | null;
};

const alertaInfo = {
  hoy:      { label: "Llamar hoy", cls: "bg-amber-wash text-amber"   },
  atrasado: { label: "Atrasado",   cls: "bg-danger-wash text-danger" },
} as const;

const vacio = { cliente: "", tipoCaso: "", abogado: "", sucursal: "", telefono: "", frecuencia: "7" };

export default function SeguimientosClient({
  seguimientos,
  sucursales,
  abogados,
}: {
  seguimientos: SeguimientoView[];
  sucursales: string[];
  abogados: string[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [fAbogado, setFAbogado] = useState("");
  const [fSucursal, setFSucursal] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  function set(c: keyof typeof vacio, v: string) { setForm((f) => ({ ...f, [c]: v })); }

  const activos = seguimientos.length;
  const porLlamarHoy = seguimientos.filter((s) => s.alerta === "hoy").length;
  const atrasados = seguimientos.filter((s) => s.alerta === "atrasado").length;
  const abogadosConCartera = new Set(seguimientos.map((s) => s.abogado)).size;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return seguimientos
      .filter((s) => !q || s.cliente.toLowerCase().includes(q) || s.tipoCaso.toLowerCase().includes(q))
      .filter((s) => !fAbogado || s.abogado === fAbogado)
      .filter((s) => !fSucursal || s.sucursal === fSucursal);
  }, [seguimientos, busqueda, fAbogado, fSucursal]);

  function abrirNuevo() { setEditId(null); setForm(vacio); setOpen(true); }
  function abrirEditar(s: SeguimientoView) {
    setEditId(s.id);
    setForm({ cliente: s.cliente, tipoCaso: s.tipoCaso, abogado: s.abogado, sucursal: s.sucursal, telefono: s.telefono === "—" ? "" : s.telefono, frecuencia: String(s.frecuencia) });
    setOpen(true);
  }
  async function borrar(id: string) { if (confirm("¿Eliminar este seguimiento?")) await borrarSeguimientoAction(id); }
  async function marcar(id: string) { await marcarLlamadoAction(id); }
  async function guardar() {
    setSaving(true);
    const data = { cliente: form.cliente, tipoCaso: form.tipoCaso, abogado: form.abogado, sucursal: form.sucursal, telefono: form.telefono, frecuencia: parseInt(form.frecuencia) || 7 };
    if (editId) { await editarSeguimientoAction(editId, data); } else { await crearSeguimientoAction(data); }
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <PageTitle eyebrow="Clientes" title="Seguimientos" subtitle="Llamadas recurrentes por abogado — para que ningún cliente se enfríe" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Casos activos",        valor: String(activos),              color: "text-ink"    },
          { label: "Por llamar hoy",       valor: String(porLlamarHoy),         color: "text-amber"  },
          { label: "Atrasados",            valor: String(atrasados),            color: "text-danger" },
          { label: "Abogados con cartera", valor: String(abogadosConCartera),   color: "text-ink"    },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="eyebrow text-muted">{k.label}</p>
            <p className={`num text-[34px] font-semibold leading-none mt-3 ${k.color}`}>{k.valor}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar cliente o caso…" />
        <FilterSelect label="Abogado" value={fAbogado} onChange={setFAbogado} options={abogados} />
        <FilterSelect label="Sucursal" value={fSucursal} onChange={setFSucursal} options={sucursales} />
        <span className="flex-1" />
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={18} strokeWidth={1.75} /> Nuevo seguimiento
        </button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Cliente</th>
              <th className="eyebrow text-muted px-3 py-3">Tipo de caso</th>
              <th className="eyebrow text-muted px-3 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Teléfono</th>
              <th className="eyebrow text-muted px-3 py-3">Próximo llamado</th>
              <th className="eyebrow text-muted px-3 py-3">Cada</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {visibles.map((s) => (
              <tr key={s.id} className={`transition-colors ${s.alerta ? "bg-paper/40" : "hover:bg-paper/60"}`}>
                <td className="px-5 py-3.5 font-bold">{s.cliente}</td>
                <td className="px-3 py-3.5">{s.tipoCaso}</td>
                <td className="px-3 py-3.5">{s.abogado}</td>
                <td className="px-3 py-3.5 num text-muted whitespace-nowrap"><Phone size={13} className="inline mr-1" />{s.telefono}</td>
                <td className="px-3 py-3.5">
                  <span className="num">{s.proximoLlamado}</span>
                  {s.alerta && <span className={`ml-2 px-2 py-0.5 rounded text-[11px] font-bold ${alertaInfo[s.alerta].cls}`}>{alertaInfo[s.alerta].label}</span>}
                </td>
                <td className="px-3 py-3.5 num text-muted">{s.frecuencia} días</td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => marcar(s.id)} className="flex items-center gap-1 px-2 py-1 rounded-md border border-line text-[12px] font-bold hover:border-navy/40 transition-colors"><PhoneCall size={14} /> Llamé</button>
                    <button onClick={() => abrirEditar(s)} className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => borrar(s.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
        <p className="text-[12px] text-muted px-5 py-3 flex items-center gap-1.5">
          <MessageCircle size={13} className="text-success" /> Cada mañana el bot le recuerda por WhatsApp a cada abogado a quién debe llamar hoy.
        </p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar seguimiento" : "Nuevo seguimiento"} onSubmit={guardar} submitLabel={saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear seguimiento"}>
        <Field label="Cliente" full><Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nombre del cliente" required /></Field>
        <Field label="Tipo de caso"><Input value={form.tipoCaso} onChange={(e) => set("tipoCaso", e.target.value)} placeholder="Divorcio, pagaré…" /></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="961 123 4567" /></Field>
        <Field label="Abogado"><Select options={abogados} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} /></Field>
        <Field label="Sucursal"><Select options={sucursales} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
        <Field label="Llamar cada (días)" full><Input type="number" value={form.frecuencia} onChange={(e) => set("frecuencia", e.target.value)} placeholder="7" /></Field>
      </Modal>
    </>
  );
}
