"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { expedientes as iniciales, type Expediente, MATERIAS, ETAPAS, ABOGADOS, SUCURSALES } from "@/lib/mock";
import { PageTitle, Card, FilterSelect, SearchBox, EstadoBadge, MateriaTag, Vencimiento } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";

const ESTADOS = ["Activo", "Suspendido", "Concluido", "Archivado"];
const vacio = { numeroJudicial: "", cliente: "", materia: "", etapa: "", abogado: "", sucursal: "" };

export default function ExpedientesPage() {
  const { data: session } = useSession();
  const rol = session?.user?.rol;
  const miNombre = session?.user?.name;
  const esAdmin = rol === "admin";

  const [lista, setLista] = useState<Expediente[]>(iniciales);
  const [busqueda, setBusqueda] = useState("");
  const [fMateria, setFMateria] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fAbogado, setFAbogado] = useState("");
  const [fSucursal, setFSucursal] = useState("");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);

  function set(campo: keyof typeof vacio, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista
      .filter((e) => esAdmin || e.abogado === miNombre)
      .filter((e) => !q || e.cliente.toLowerCase().includes(q) || e.numeroInterno.toLowerCase().includes(q) || e.numeroJudicial.toLowerCase().includes(q))
      .filter((e) => !fMateria || e.materia === fMateria)
      .filter((e) => !fEstado || e.estado === fEstado)
      .filter((e) => !fAbogado || e.abogado === fAbogado)
      .filter((e) => !fSucursal || e.sucursal === fSucursal);
  }, [lista, esAdmin, miNombre, busqueda, fMateria, fEstado, fAbogado, fSucursal]);

  function abrirNuevo() {
    setEditId(null);
    setForm(vacio);
    setOpen(true);
  }

  function abrirEditar(e: Expediente) {
    setEditId(e.id);
    setForm({ numeroJudicial: e.numeroJudicial, cliente: e.cliente, materia: e.materia, etapa: e.etapa, abogado: e.abogado, sucursal: e.sucursal });
    setOpen(true);
  }

  function borrar(id: string) {
    if (confirm("¿Eliminar este expediente?")) setLista((l) => l.filter((e) => e.id !== id));
  }

  function guardar() {
    if (editId) {
      setLista((l) => l.map((e) => (e.id === editId ? { ...e, ...form } : e)));
    } else {
      const n = lista.length + 1;
      const nuevo: Expediente = {
        id: `nuevo-${Date.now()}`,
        numeroInterno: `EXP-2026-${String(140 + n).padStart(4, "0")}`,
        numeroJudicial: form.numeroJudicial || "—",
        cliente: form.cliente,
        materia: form.materia || "Civil",
        etapa: form.etapa || "Demanda",
        abogado: form.abogado || (esAdmin ? "Christian" : miNombre || "Christian"),
        sucursal: form.sucursal || "Tuxtla",
        estado: "Activo",
        vencimiento: null,
        urgente: false,
      };
      setLista((l) => [nuevo, ...l]);
    }
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
        <FilterSelect label="Estado" value={fEstado} onChange={setFEstado} options={ESTADOS} />
        {esAdmin && <FilterSelect label="Abogado" value={fAbogado} onChange={setFAbogado} options={ABOGADOS} />}
        <FilterSelect label="Sucursal" value={fSucursal} onChange={setFSucursal} options={SUCURSALES} />
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
                    <button onClick={() => abrirEditar(e)} title="Editar" className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => borrar(e.id)} title="Eliminar" className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar expediente" : "Nuevo expediente"} onSubmit={guardar} submitLabel={editId ? "Guardar cambios" : "Crear expediente"}>
        <Field label="Cliente" full>
          <Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nombre del cliente" required />
        </Field>
        <Field label="N.º de juicio">
          <Input value={form.numeroJudicial} onChange={(e) => set("numeroJudicial", e.target.value)} placeholder="542/2026" />
        </Field>
        <Field label="Materia">
          <Select options={MATERIAS} value={form.materia} onChange={(e) => set("materia", e.target.value)} />
        </Field>
        <Field label="Etapa procesal">
          <Select options={ETAPAS} value={form.etapa} onChange={(e) => set("etapa", e.target.value)} />
        </Field>
        <Field label="Abogado responsable">
          <Select options={ABOGADOS} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} />
        </Field>
        <Field label="Sucursal">
          <Select options={SUCURSALES} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
