"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageTitle, Card, FilterSelect, SearchBox, EstadoBadge, MateriaTag, Vencimiento } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { MATERIAS, ETAPAS, ESTADOS_EXP } from "@/lib/constants";
import { crearExpedienteAction, editarExpedienteAction, borrarExpedienteAction } from "./actions";

export type ExpView = {
  id: string;
  numeroInterno: string;
  numeroJudicial: string;
  cliente: string;
  materia: string;
  etapa: string;
  abogado: string;
  sucursal: string;
  estado: string;
  vencimiento: string | null;
  urgente: boolean;
};

const vacio = { numeroJudicial: "", cliente: "", materia: "", etapa: "", abogado: "", sucursal: "" };

export default function ExpedientesClient({
  expedientes,
  sucursales,
  abogados,
  sesionRol,
  sesionNombre,
}: {
  expedientes: ExpView[];
  sucursales: string[];
  abogados: string[];
  sesionRol: string;
  sesionNombre: string;
}) {
  const esAdmin = sesionRol === "admin";
  const [busqueda, setBusqueda] = useState("");
  const [fMateria, setFMateria] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fAbogado, setFAbogado] = useState("");
  const [fSucursal, setFSucursal] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  function set(campo: keyof typeof vacio, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return expedientes
      .filter((e) => esAdmin || e.abogado === sesionNombre)
      .filter((e) => !q || e.cliente.toLowerCase().includes(q) || e.numeroInterno.toLowerCase().includes(q) || e.numeroJudicial.toLowerCase().includes(q))
      .filter((e) => !fMateria || e.materia === fMateria)
      .filter((e) => !fEstado || e.estado.toLowerCase() === fEstado.toLowerCase())
      .filter((e) => !fAbogado || e.abogado === fAbogado)
      .filter((e) => !fSucursal || e.sucursal === fSucursal);
  }, [expedientes, esAdmin, sesionNombre, busqueda, fMateria, fEstado, fAbogado, fSucursal]);

  function abrirNuevo() {
    setEditId(null);
    setForm(vacio);
    setOpen(true);
  }

  function abrirEditar(e: ExpView) {
    setEditId(e.id);
    setForm({ numeroJudicial: e.numeroJudicial === "—" ? "" : e.numeroJudicial, cliente: e.cliente, materia: e.materia, etapa: e.etapa, abogado: e.abogado, sucursal: e.sucursal });
    setOpen(true);
  }

  async function borrar(id: string) {
    if (confirm("¿Eliminar este expediente?")) await borrarExpedienteAction(id);
  }

  async function guardar() {
    setSaving(true);
    if (editId) {
      await editarExpedienteAction(editId, form);
    } else {
      await crearExpedienteAction(form);
    }
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <PageTitle
        eyebrow="Despacho"
        title={esAdmin ? "Expedientes" : "Mis expedientes"}
        subtitle={`${visibles.length} ${esAdmin ? "en pantalla" : "asignados a ti"}`}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar cliente o número…" />
        <FilterSelect label="Materia" value={fMateria} onChange={setFMateria} options={MATERIAS} />
        <FilterSelect label="Estado" value={fEstado} onChange={setFEstado} options={ESTADOS_EXP} />
        {esAdmin && <FilterSelect label="Abogado" value={fAbogado} onChange={setFAbogado} options={abogados} />}
        <FilterSelect label="Sucursal" value={fSucursal} onChange={setFSucursal} options={sucursales} />
        <span className="flex-1" />
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={18} strokeWidth={1.75} /> Nuevo expediente
        </button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">N.º expediente</th>
              <th className="eyebrow text-muted px-3 py-3">Cliente</th>
              <th className="eyebrow text-muted px-3 py-3">Materia</th>
              <th className="eyebrow text-muted px-3 py-3">Etapa</th>
              <th className="eyebrow text-muted px-3 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">Estado</th>
              <th className="eyebrow text-muted px-3 py-3">Vence</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70 text-[13.5px]">
            {visibles.map((e) => (
              <tr key={e.id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3.5">
                  <Link href={`/expedientes/${e.id}`} className="exp-no font-semibold text-ink hover:text-navy transition-colors">{e.numeroInterno}</Link>
                  <br /><span className="text-[11.5px] text-muted">{e.numeroJudicial}</span>
                </td>
                <td className="px-3 py-3.5">{e.cliente}</td>
                <td className="px-3 py-3.5"><MateriaTag materia={e.materia} /></td>
                <td className="px-3 py-3.5 text-muted">{e.etapa}</td>
                <td className="px-3 py-3.5">{e.abogado}</td>
                <td className="px-3 py-3.5 text-muted">{e.sucursal}</td>
                <td className="px-3 py-3.5"><EstadoBadge estado={e.estado} /></td>
                <td className="px-3 py-3.5"><Vencimiento texto={e.vencimiento} urgente={e.urgente} /></td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => abrirEditar(e)} className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => borrar(e.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-10 text-center text-muted text-[13.5px]">No hay expedientes que coincidan con los filtros.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar expediente" : "Nuevo expediente"} onSubmit={guardar} submitLabel={saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear expediente"}>
        <Field label="Cliente" full><Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nombre del cliente" required /></Field>
        <Field label="N.º de juicio"><Input value={form.numeroJudicial} onChange={(e) => set("numeroJudicial", e.target.value)} placeholder="542/2026" /></Field>
        <Field label="Materia"><Select options={MATERIAS} value={form.materia} onChange={(e) => set("materia", e.target.value)} /></Field>
        <Field label="Etapa procesal"><Select options={ETAPAS} value={form.etapa} onChange={(e) => set("etapa", e.target.value)} /></Field>
        <Field label="Abogado responsable"><Select options={abogados} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} /></Field>
        <Field label="Sucursal"><Select options={sucursales} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
      </Modal>
    </>
  );
}
