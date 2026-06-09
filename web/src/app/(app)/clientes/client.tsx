"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageTitle, Card, FilterSelect, SearchBox } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { crearClienteAction, editarClienteAction, borrarClienteAction } from "./actions";

export type ClienteView = {
  id: string;
  nombre: string;
  tipo: string;
  telefono: string;
  email: string;
  expedientes: number;
  ultimaAsesoria: string | null;
};

const vacio = { nombre: "", tipo: "Física", telefono: "", email: "" };

export default function ClientesClient({ clientes }: { clientes: ClienteView[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  function set(c: keyof typeof vacio, v: string) { setForm((f) => ({ ...f, [c]: v })); }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientes
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || c.telefono.includes(q))
      .filter((c) => !fTipo || c.tipo === fTipo);
  }, [clientes, busqueda, fTipo]);

  function abrirNuevo() { setEditId(null); setForm(vacio); setOpen(true); }
  function abrirEditar(c: ClienteView) {
    setEditId(c.id);
    setForm({ nombre: c.nombre, tipo: c.tipo === "Moral" ? "Moral" : "Física", telefono: c.telefono === "—" ? "" : c.telefono, email: c.email });
    setOpen(true);
  }
  async function borrar(id: string) { if (confirm("¿Eliminar este cliente?")) await borrarClienteAction(id); }
  async function guardar() {
    setSaving(true);
    const data = { nombre: form.nombre, tipo: form.tipo === "Moral" ? "moral" : "fisica", telefono: form.telefono, email: form.email };
    if (editId) { await editarClienteAction(editId, data); } else { await crearClienteAction(data); }
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <PageTitle eyebrow="Clientes" title="Clientes" subtitle={`${visibles.length} en pantalla`} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar nombre o teléfono…" />
        <FilterSelect label="Tipo" value={fTipo} onChange={setFTipo} options={["Física", "Moral"]} />
        <span className="flex-1" />
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={18} strokeWidth={1.75} /> Nuevo cliente
        </button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Nombre</th>
              <th className="eyebrow text-muted px-3 py-3">Tipo</th>
              <th className="eyebrow text-muted px-3 py-3">Teléfono</th>
              <th className="eyebrow text-muted px-3 py-3">Expedientes</th>
              <th className="eyebrow text-muted px-3 py-3">Última asesoría</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {visibles.map((c) => (
              <tr key={c.id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3.5 font-bold">{c.nombre}</td>
                <td className="px-3 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${c.tipo === "Moral" ? "bg-navy/[.08] text-navy" : "bg-line/60 text-muted"}`}>{c.tipo}</span>
                </td>
                <td className="px-3 py-3.5 num text-muted">{c.telefono}</td>
                <td className="px-3 py-3.5 num">{c.expedientes}</td>
                <td className="px-3 py-3.5 num text-muted">{c.ultimaAsesoria ?? "—"}</td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => borrar(c.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar cliente" : "Nuevo cliente"} onSubmit={guardar} submitLabel={saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear cliente"}>
        <Field label="Nombre" full><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre o razón social" required /></Field>
        <Field label="Tipo"><Select options={["Física", "Moral"]} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} /></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="961 123 4567" /></Field>
        <Field label="Email" full><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="correo@ejemplo.com" /></Field>
      </Modal>
    </>
  );
}
