"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { PageTitle, Card, FilterSelect, SearchBox, EstadoBadge, MateriaTag, Vencimiento } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { MATERIAS, ETAPAS, ESTADOS_EXP } from "@/lib/constants";
import { crearExpedienteAction, editarExpedienteAction, borrarExpedienteAction, crearClienteRapidoAction } from "./actions";

export type ExpView = {
  id: string;
  clienteId: string | null;
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

export type ClienteBasico = { id: string; nombre: string; telefono?: string };

const vacio = {
  clienteId: "",
  clienteNombre: "",
  numeroJudicial: "",
  materia: "",
  etapa: "",
  abogado: "",
  sucursal: "",
};

// ── ClientePicker ─────────────────────────────────────────────────────────────

function ClientePicker({
  clientes,
  clienteId,
  clienteNombre,
  onChange,
}: {
  clientes: ClienteBasico[];
  clienteId: string;
  clienteNombre: string;
  onChange: (id: string, nombre: string) => void;
}) {
  const [query, setQuery] = useState(clienteNombre);
  const [open, setOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTel, setNuevoTel] = useState("");
  const [creando, setCreando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(clienteNombre); }, [clienteNombre]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q)).slice(0, 8);
  }, [clientes, query]);

  function seleccionar(c: ClienteBasico) {
    onChange(c.id, c.nombre);
    setQuery(c.nombre);
    setOpen(false);
  }

  async function crearCliente() {
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    const result = await crearClienteRapidoAction(nuevoNombre.trim(), nuevoTel.trim() || undefined);
    onChange(result.id, result.nombre);
    setQuery(result.nombre);
    setCreando(false);
    setCrearOpen(false);
    setNuevoNombre("");
    setNuevoTel("");
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Buscar cliente o escribir nombre…"
        required
        onChange={(e) => {
          setQuery(e.target.value);
          onChange("", e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
      />

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-line rounded-lg shadow-lg overflow-hidden">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => seleccionar(c)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13.5px] hover:bg-paper transition-colors ${c.id === clienteId ? "bg-navy/[.06] text-navy font-bold" : ""}`}
            >
              <span className="flex-1 truncate">{c.nombre}</span>
              {c.telefono && <span className="text-[12px] text-muted shrink-0">{c.telefono}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-[13px] text-muted">Sin resultados</p>
          )}
          <div className="border-t border-line">
            <button
              type="button"
              onMouseDown={() => { setOpen(false); setCrearOpen(true); setNuevoNombre(query); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-navy font-bold hover:bg-navy/[.04] transition-colors"
            >
              <UserPlus size={15} strokeWidth={2} /> Crear cliente nuevo
            </button>
          </div>
        </div>
      )}

      {crearOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5">
            <p className="font-serif text-[17px] text-ink font-bold mb-4">Nuevo cliente</p>
            <div className="space-y-3">
              <label className="block">
                <span className="eyebrow text-muted block mb-1">Nombre</span>
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre completo o razón social"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
                />
              </label>
              <label className="block">
                <span className="eyebrow text-muted block mb-1">Teléfono</span>
                <input
                  value={nuevoTel}
                  onChange={(e) => setNuevoTel(e.target.value)}
                  placeholder="961 123 4567"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => { setCrearOpen(false); setNuevoNombre(""); setNuevoTel(""); }}
                className="px-3 py-2 rounded-lg text-[13px] text-muted hover:bg-paper transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={crearCliente}
                disabled={creando || !nuevoNombre.trim()}
                className="px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
              >
                {creando ? "Creando…" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ExpedientesClient ─────────────────────────────────────────────────────────

export default function ExpedientesClient({
  expedientes,
  sucursales,
  abogados,
  clientes,
  sesionRol,
  sesionNombre,
}: {
  expedientes: ExpView[];
  sucursales: string[];
  abogados: string[];
  clientes: ClienteBasico[];
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
    setForm({ ...vacio, abogado: esAdmin ? "" : sesionNombre });
    setOpen(true);
  }

  function abrirEditar(e: ExpView) {
    setEditId(e.id);
    setForm({
      clienteId: e.clienteId ?? "",
      clienteNombre: e.cliente === "—" ? "" : e.cliente,
      numeroJudicial: e.numeroJudicial === "—" ? "" : e.numeroJudicial,
      materia: e.materia === "—" ? "" : e.materia,
      etapa: e.etapa === "—" ? "" : e.etapa,
      abogado: e.abogado === "—" ? "" : e.abogado,
      sucursal: e.sucursal === "—" ? "" : e.sucursal,
    });
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
        <Field label="Cliente" full>
          <ClientePicker
            clientes={clientes}
            clienteId={form.clienteId}
            clienteNombre={form.clienteNombre}
            onChange={(id, nombre) => setForm((f) => ({ ...f, clienteId: id, clienteNombre: nombre }))}
          />
        </Field>
        <Field label="N.º de juicio"><Input value={form.numeroJudicial} onChange={(e) => set("numeroJudicial", e.target.value)} placeholder="542/2026" /></Field>
        <Field label="Materia"><Select options={MATERIAS} value={form.materia} onChange={(e) => set("materia", e.target.value)} /></Field>
        <Field label="Etapa procesal"><Select options={ETAPAS} value={form.etapa} onChange={(e) => set("etapa", e.target.value)} /></Field>
        {esAdmin && <Field label="Abogado responsable"><Select options={abogados} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} /></Field>}
        <Field label="Sucursal"><Select options={sucursales} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
      </Modal>
    </>
  );
}
