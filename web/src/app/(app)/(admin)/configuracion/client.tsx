"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { crearUsuarioAction, editarUsuarioAction, borrarUsuarioAction } from "./actions";

export type UsuarioView = {
  id: string;
  nombre: string;
  email: string | null;
  rol: string;
  telefonoWhatsapp: string | null;
  sucursal: string | null;
  sucursalId: string | null;
  sucursalEncargada: string | null;
  sucursalEncargadaId: string | null;
  activo: boolean;
};

const ROL_LABELS: Record<string, string> = { admin: "Admin", abogado: "Abogado", asistente: "Asistente" };
const vacio = { nombre: "", email: "", password: "", rol: "abogado", sucursalId: "", sucursalEncargadaId: "", telefonoWhatsapp: "" };

export default function ConfiguracionClient({
  usuarios,
  sucursales,
}: {
  usuarios: UsuarioView[];
  sucursales: { id: string; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  function set(c: keyof typeof vacio, v: string) { setForm((f) => ({ ...f, [c]: v })); }

  function abrirNuevo() {
    setEditId(null);
    setForm(vacio);
    setOpen(true);
  }

  function abrirEditar(u: UsuarioView) {
    setEditId(u.id);
    setForm({
      nombre: u.nombre,
      email: u.email ?? "",
      password: "",
      rol: u.rol,
      sucursalId: u.sucursalId ?? "",
      sucursalEncargadaId: u.sucursalEncargadaId ?? "",
      telefonoWhatsapp: u.telefonoWhatsapp ?? "",
    });
    setOpen(true);
  }

  async function borrar(id: string) {
    if (confirm("¿Desactivar este usuario?")) await borrarUsuarioAction(id);
  }

  async function guardar() {
    setSaving(true);
    if (editId) {
      await editarUsuarioAction(editId, form);
    } else {
      await crearUsuarioAction(form);
    }
    setSaving(false);
    setOpen(false);
  }

  const activos = useMemo(() => usuarios.filter((u) => u.activo), [usuarios]);
  const sucursalOpts = sucursales.map((s) => s.nombre);
  const sucursalIds = useMemo(() => {
    const m: Record<string, string> = { "": "" };
    sucursales.forEach((s) => { m[s.nombre] = s.id; });
    return m;
  }, [sucursales]);

  return (
    <>
      <PageTitle eyebrow="Administración" title="Configuración" subtitle="Usuarios, accesos y personalización del despacho" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line"><h3 className="font-serif text-[17px]">Datos del despacho</h3></div>
          <div className="divide-y divide-line/70">
            <Fila k="Nombre" v="Villafuerte y Asociados" />
            <Fila k="Sucursales" v={sucursales.map((s) => s.nombre).join(" · ")} />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line"><h3 className="font-serif text-[17px]">Catálogos</h3></div>
          <div className="divide-y divide-line/70">
            <Fila k="Materias" v="Civil, Mercantil, Penal, Familiar…" />
            <Fila k="Etapas" v="Demanda → Contestación → Pruebas…" />
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto mt-5">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <h3 className="font-serif text-[17px]">Usuarios</h3>
          <button onClick={abrirNuevo} className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-line text-[12.5px] hover:border-navy/40 transition-colors">
            <Plus size={16} /> Agregar
          </button>
        </div>
        <table className="w-full min-w-[680px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Nombre</th>
              <th className="eyebrow text-muted px-3 py-3">Correo</th>
              <th className="eyebrow text-muted px-3 py-3">Rol</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">Encargado de</th>
              <th className="eyebrow text-muted px-3 py-3">WhatsApp</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {activos.map((u) => (
              <tr key={u.id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3 font-bold">{u.nombre}</td>
                <td className="px-3 py-3 text-muted">{u.email ?? "—"}</td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${u.rol === "admin" ? "bg-amber-wash text-amber" : "bg-navy/[.08] text-navy"}`}>
                    {ROL_LABELS[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-3 py-3">{u.sucursal ?? "—"}</td>
                <td className="px-3 py-3 text-muted">{u.sucursalEncargada ?? "—"}</td>
                <td className="px-3 py-3 num text-muted">{u.telefonoWhatsapp ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => abrirEditar(u)} className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => borrar(u.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {activos.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">Sin usuarios. Agrega el primero.</td></tr>
            )}
          </tbody>
        </table>
        <p className="text-[12px] text-muted px-5 py-3">El WhatsApp identifica quién dicta por el bot, para registrar actuaciones a su nombre.</p>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Editar usuario" : "Agregar usuario"}
        onSubmit={guardar}
        submitLabel={saving ? "Guardando…" : editId ? "Guardar cambios" : "Agregar usuario"}
      >
        <Field label="Nombre" full><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Lic. Nombre Apellido" required /></Field>
        <Field label="Correo electrónico"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="correo@despacho.mx" /></Field>
        <Field label={editId ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"} full>
          <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={editId ? "••••••••" : "Mínimo 8 caracteres"} required={!editId} />
        </Field>
        <Field label="Rol">
          <Select options={["admin", "abogado", "asistente"]} value={form.rol} onChange={(e) => set("rol", e.target.value)} />
        </Field>
        <Field label="Sucursal (trabaja en)">
          <Select
            options={["", ...sucursalOpts]}
            value={sucursales.find((s) => s.id === form.sucursalId)?.nombre ?? ""}
            onChange={(e) => set("sucursalId", sucursalIds[e.target.value] ?? "")}
          />
        </Field>
        <Field label="Encargado de (sucursal)">
          <Select
            options={["", ...sucursalOpts]}
            value={sucursales.find((s) => s.id === form.sucursalEncargadaId)?.nombre ?? ""}
            onChange={(e) => set("sucursalEncargadaId", sucursalIds[e.target.value] ?? "")}
          />
        </Field>
        <Field label="WhatsApp (para dictar al bot)" full>
          <Input value={form.telefonoWhatsapp} onChange={(e) => set("telefonoWhatsapp", e.target.value)} placeholder="961 123 4567" />
        </Field>
      </Modal>
    </>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-[13.5px] gap-4">
      <span className="text-muted shrink-0">{k}</span>
      <span className="font-bold text-right">{v}</span>
    </div>
  );
}
