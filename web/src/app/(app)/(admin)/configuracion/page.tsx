"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
const SUCURSALES = ["Tuxtla", "San Cristóbal", "Tapachula", "Villaflores", "Comitán"];
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";

type Usuario = { _id: string; nombre: string; rol: string; whatsapp: string };

const inicialesUsuarios: Usuario[] = [
  { _id: "u1", nombre: "Lic. Christian", rol: "Admin", whatsapp: "961 268 3551" },
  { _id: "u2", nombre: "Lic. Ana", rol: "Abogado", whatsapp: "961 550 9634" },
];
const vacio = { nombre: "", rol: "Abogado", whatsapp: "", sucursal: "" };

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-[13.5px] gap-4">
      <span className="text-muted shrink-0">{k}</span>
      <span className="font-bold text-right">{v}</span>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(inicialesUsuarios);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);

  function set(c: keyof typeof vacio, v: string) {
    setForm((f) => ({ ...f, [c]: v }));
  }
  function abrirNuevo() {
    setEditId(null);
    setForm(vacio);
    setOpen(true);
  }
  function abrirEditar(u: Usuario) {
    setEditId(u._id);
    setForm({ nombre: u.nombre, rol: u.rol, whatsapp: u.whatsapp, sucursal: "" });
    setOpen(true);
  }
  function borrar(id: string) {
    if (confirm("¿Eliminar este usuario?")) setUsuarios((u) => u.filter((x) => x._id !== id));
  }
  function guardar() {
    if (editId) {
      setUsuarios((u) => u.map((x) => (x._id === editId ? { ...x, nombre: form.nombre, rol: form.rol, whatsapp: form.whatsapp || "—" } : x)));
    } else {
      setUsuarios((u) => [...u, { _id: `u${Date.now()}`, nombre: form.nombre, rol: form.rol, whatsapp: form.whatsapp || "—" }]);
    }
    setOpen(false);
  }

  return (
    <>
      <PageTitle eyebrow="Administración" title="Configuración" subtitle="Personalización del despacho — esto hace al sistema reutilizable" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line"><h3 className="font-serif text-[17px]">Datos del despacho</h3></div>
          <div className="divide-y divide-line/70">
            <Fila k="Nombre" v="Villafuerte y Asociados" />
            <Fila k="Logo" v="Subir imagen" />
            <Fila k="Sucursales" v="Tuxtla · San Cristóbal · Tapachula · Villaflores · Comitán" />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line"><h3 className="font-serif text-[17px]">Catálogos editables</h3></div>
          <div className="divide-y divide-line/70">
            <Fila k="Materias" v="Civil, Mercantil, Penal, Familiar…" />
            <Fila k="Etapas procesales" v="Demanda → Contestación → Pruebas…" />
            <Fila k="Juzgados" v="12 registrados" />
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto mt-5">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <h3 className="font-serif text-[17px]">Usuarios y WhatsApp</h3>
          <button onClick={abrirNuevo} className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-line text-[12.5px] hover:border-navy/40 transition-colors">
            <Plus size={16} /> Agregar
          </button>
        </div>
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Nombre</th>
              <th className="eyebrow text-muted px-3 py-3">Rol</th>
              <th className="eyebrow text-muted px-3 py-3">WhatsApp (dictado)</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {usuarios.map((u) => (
              <tr key={u._id}>
                <td className="px-5 py-3 font-bold">{u.nombre}</td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${u.rol === "Admin" ? "bg-amber-wash text-amber" : "bg-navy/[.08] text-navy"}`}>{u.rol}</span>
                </td>
                <td className="px-3 py-3 num text-muted">{u.whatsapp}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => abrirEditar(u)} title="Editar" className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => borrar(u._id)} title="Eliminar" className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[12px] text-muted px-5 py-3">El teléfono identifica quién dicta por el bot, para registrar la actuación a su nombre.</p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar usuario" : "Agregar usuario"} onSubmit={guardar} submitLabel={editId ? "Guardar cambios" : "Agregar usuario"}>
        <Field label="Nombre" full><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Lic. Nombre Apellido" required /></Field>
        <Field label="Rol"><Select options={["Admin", "Abogado", "Asistente"]} value={form.rol} onChange={(e) => set("rol", e.target.value)} /></Field>
        <Field label="Sucursal"><Select options={SUCURSALES} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
        <Field label="WhatsApp (para dictar al bot)" full><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="961 123 4567" /></Field>
      </Modal>
    </>
  );
}
