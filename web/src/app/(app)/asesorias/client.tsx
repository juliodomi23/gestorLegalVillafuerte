"use client";

import { useState, useMemo } from "react";
import { Plus, ChevronDown, ChevronRight, MessageCircle, FileText, Pencil, Trash2, ExternalLink } from "lucide-react";
import { PageTitle, Card, SearchBox, FilterSelect } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { useConfirm } from "@/components/confirm";
import type { StatusAsesoria } from "@/lib/constants";
import { crearAsesoriaAction, editarAsesoriaAction, borrarAsesoriaAction, cambiarStatusAsesoriaAction } from "./actions";

export type AsesoriaView = {
  id: string;
  fecha: string;       // dd/mm/yyyy
  nombre: string;
  telefono: string;
  asunto: string;
  sucursal: string;
  abogado: string;
  pago: boolean;
  monto: number;
  status: StatusAsesoria;
  urlDocumento: string | null;
};

const statusInfo: Record<StatusAsesoria, { label: string; cls: string }> = {
  pendiente:        { label: "Pendiente",        cls: "bg-amber-wash text-amber" },
  contrato_firmado: { label: "Contrato firmado", cls: "bg-success-wash text-success" },
  no_regreso:       { label: "No regresó",       cls: "bg-line/60 text-muted" },
  descartado:       { label: "Descartado",       cls: "bg-danger-wash text-danger" },
};
const STATUS_LABELS = ["Pendiente", "Contrato firmado", "No regresó", "Descartado"];
const labelToStatus: Record<string, StatusAsesoria> = {
  "Pendiente": "pendiente", "Contrato firmado": "contrato_firmado", "No regresó": "no_regreso", "Descartado": "descartado",
};

function formatFecha(f: string) {
  const [d, m, y] = f.split("/").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function DaySection({ fecha, rows, onEdit, onDelete }: { fecha: string; rows: AsesoriaView[]; onEdit: (r: AsesoriaView) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const recaudado = rows.filter((r) => r.pago).reduce((s, r) => s + r.monto, 0);
  return (
    <div className="border border-line rounded-xl overflow-hidden mb-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-5 py-3 bg-paper/60 hover:bg-paper transition-colors text-left">
        {open ? <ChevronDown size={16} className="text-muted shrink-0" /> : <ChevronRight size={16} className="text-muted shrink-0" />}
        <span className="font-serif text-[15px] text-ink capitalize flex-1">{formatFecha(fecha)}</span>
        <span className="text-[12px] text-muted num mr-3">{rows.length} asesoría{rows.length !== 1 ? "s" : ""}</span>
        {recaudado > 0 && <span className="text-[12px] font-bold text-success num">${recaudado.toLocaleString("es-MX")} recaudado</span>}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-t border-b border-line text-left bg-surface">
                <th className="eyebrow text-muted px-5 py-2.5">Prospecto</th>
                <th className="eyebrow text-muted px-3 py-2.5">Asunto</th>
                <th className="eyebrow text-muted px-3 py-2.5">Abogado</th>
                <th className="eyebrow text-muted px-3 py-2.5">Pagó</th>
                <th className="eyebrow text-muted px-3 py-2.5">Status</th>
                <th className="eyebrow text-muted px-3 py-2.5 text-right">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-surface">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-paper/40 transition-colors">
                  <td className="px-5 py-3"><p className="font-bold text-ink">{a.nombre}</p><p className="text-[11.5px] num text-muted">{a.telefono}</p></td>
                  <td className="px-3 py-3 text-ink">{a.asunto}</td>
                  <td className="px-3 py-3 text-muted">{a.abogado}</td>
                  <td className="px-3 py-3">{a.pago ? <span className="text-success font-bold num">${a.monto.toLocaleString("es-MX")}</span> : <span className="text-muted">No</span>}</td>
                  <td className="px-3 py-3">
                    <div className="relative group inline-block">
                      <button className={`px-2 py-0.5 rounded text-[11.5px] font-bold cursor-pointer hover:opacity-80 transition-opacity ${statusInfo[a.status].cls}`}>
                        {statusInfo[a.status].label}
                      </button>
                      <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block bg-white border border-line rounded-lg shadow-lg py-1 min-w-[160px]">
                        {(Object.entries(statusInfo) as [StatusAsesoria, { label: string; cls: string }][]).map(([key, info]) => (
                          <button
                            key={key}
                            onMouseDown={() => cambiarStatusAsesoriaAction(a.id, key)}
                            className={`w-full text-left px-3 py-1.5 text-[12px] font-bold hover:bg-paper transition-colors ${key === a.status ? "opacity-50 cursor-default" : ""}`}
                          >
                            <span className={`px-1.5 py-0.5 rounded ${info.cls}`}>{info.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {a.urlDocumento ? <a href={a.urlDocumento} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><ExternalLink size={14} /></a> : <span className="p-1.5 w-[30px]" />}
                      <button onClick={() => onEdit(a)} className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(a.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS_FIJAS = ["Todas"];
const vacio = { nombre: "", telefono: "", asunto: "", sucursal: "", abogado: "", pago: "No", monto: "", status: "Pendiente" };

export default function AsesoriasClient({
  asesorias,
  sucursales,
  abogados,
}: {
  asesorias: AsesoriaView[];
  sucursales: string[];
  abogados: string[];
}) {
  const TABS = [...TABS_FIJAS, ...sucursales];
  const [tabActiva, setTabActiva] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [fAbogado, setFAbogado] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fFecha, setFFecha] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();

  function set(c: keyof typeof vacio, v: string) { setForm((f) => ({ ...f, [c]: v })); }

  const totalMes = asesorias.length;
  const firmaronMes = asesorias.filter((a) => a.status === "contrato_firmado").length;
  const conversionMes = totalMes ? Math.round((firmaronMes / totalMes) * 100) : 0;
  const ingresosAsesoria = asesorias.filter((a) => a.pago).reduce((s, a) => s + a.monto, 0);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return asesorias
      .filter((a) => tabActiva === "Todas" || a.sucursal === tabActiva)
      .filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.asunto.toLowerCase().includes(q))
      .filter((a) => !fAbogado || a.abogado === fAbogado)
      .filter((a) => !fStatus || statusInfo[a.status].label === fStatus)
      .filter((a) => !fFecha || a.fecha === fFecha);
  }, [asesorias, tabActiva, busqueda, fAbogado, fStatus, fFecha]);

  const porDia = useMemo(() => {
    const map = new Map<string, AsesoriaView[]>();
    for (const a of filtradas) { map.set(a.fecha, [...(map.get(a.fecha) ?? []), a]); }
    return [...map.entries()].sort(([fa], [fb]) => {
      const p = (s: string) => { const [d, m, y] = s.split("/").map(Number); return new Date(y, m - 1, d).getTime(); };
      return p(fb) - p(fa);
    });
  }, [filtradas]);

  const cuentaSucursal = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = asesorias.filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.asunto.toLowerCase().includes(q));
    return Object.fromEntries(TABS.map((t) => [t, t === "Todas" ? base.length : base.filter((a) => a.sucursal === t).length]));
  }, [asesorias, busqueda, TABS]);

  function abrirNuevo() { setEditId(null); setForm({ ...vacio, sucursal: tabActiva !== "Todas" ? tabActiva : "" }); setOpen(true); }
  function abrirEditar(a: AsesoriaView) {
    setEditId(a.id);
    setForm({ nombre: a.nombre, telefono: a.telefono, asunto: a.asunto, sucursal: a.sucursal, abogado: a.abogado, pago: a.pago ? "Sí" : "No", monto: a.pago ? String(a.monto) : "", status: statusInfo[a.status].label });
    setOpen(true);
  }
  async function borrar(id: string) {
    if (await confirmar({ titulo: "¿Eliminar esta asesoría?", peligro: true, confirmLabel: "Eliminar" })) await borrarAsesoriaAction(id);
  }
  async function guardar() {
    setSaving(true);
    const pago = form.pago === "Sí";
    const data = { nombre: form.nombre, telefono: form.telefono, asunto: form.asunto, sucursal: form.sucursal, abogado: form.abogado, pago, monto: pago ? Number(form.monto.replace(/\D/g, "")) || null : null, status: (labelToStatus[form.status] ?? "pendiente") as StatusAsesoria };
    if (editId) { await editarAsesoriaAction(editId, data); } else { await crearAsesoriaAction(data); }
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <PageTitle eyebrow="Clientes" title="Asesorías" subtitle="Prospectos por sucursal y día" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Prospectos del mes",  valor: String(totalMes),                           color: "text-ink"     },
          { label: "Contratos firmados",  valor: String(firmaronMes),                        color: "text-success" },
          { label: "Conversión",          valor: `${conversionMes}%`,                        color: "text-navy"    },
          { label: "Recaudado asesorías", valor: `$${ingresosAsesoria.toLocaleString("es-MX")}`, color: "text-ink" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="eyebrow text-muted">{k.label}</p>
            <p className={`num text-[34px] font-semibold leading-none mt-3 ${k.color}`}>{k.valor}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar prospecto o asunto…" />
        <FilterSelect label="Abogado" value={fAbogado} onChange={setFAbogado} options={abogados} />
        <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={STATUS_LABELS} />
        <input type="date"
          value={fFecha ? fFecha.split("/").reverse().join("-") : ""}
          onChange={(e) => { if (!e.target.value) { setFFecha(""); return; } const [y, m, d] = e.target.value.split("-"); setFFecha(`${d}/${m}/${y}`); }}
          className={`px-3 py-2 rounded-lg border text-[13px] cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-navy/20 ${fFecha ? "border-navy/40 bg-navy/[.04] text-navy font-bold" : "border-line bg-surface text-ink hover:border-navy/40"}`}
        />
        <span className="flex-1" />
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors"><Plus size={18} strokeWidth={1.75} /> Nueva asesoría</button>
      </div>

      <div className="flex gap-1 mb-5 border-b border-line overflow-x-auto">
        {TABS.map((tab) => {
          const activa = tabActiva === tab;
          const n = cuentaSucursal[tab] ?? 0;
          return (
            <button key={tab} onClick={() => setTabActiva(tab)} className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-bold whitespace-nowrap border-b-2 transition-colors ${activa ? "border-amber text-amber" : "border-transparent text-muted hover:text-ink"}`}>
              {tab}
              {n > 0 && <span className={`text-[11px] rounded-full px-1.5 py-0.5 leading-none ${activa ? "bg-amber text-white" : "bg-line text-muted"}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {porDia.length === 0 && <Card className="p-10 text-center text-muted text-[14px]">Sin asesorías para esta sucursal.</Card>}
      {porDia.map(([fecha, rows]) => <DaySection key={fecha} fecha={fecha} rows={rows} onEdit={abrirEditar} onDelete={borrar} />)}

      {porDia.length > 0 && (
        <p className="text-[12px] text-muted mt-2 flex items-center gap-1.5">
          <MessageCircle size={13} className="text-success" />Las asesorías entran automáticamente cuando el bot registra un prospecto nuevo.
          <FileText size={13} className="text-muted ml-2" />Los PDFs generados por el bot se abren con el botón de Drive en cada fila.
        </p>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar asesoría" : "Nueva asesoría"} onSubmit={guardar} submitLabel={saving ? "Guardando…" : editId ? "Guardar cambios" : "Registrar asesoría"}>
        <Field label="Nombre completo del prospecto" full><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre completo" required /></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="961 123 4567" /></Field>
        <Field label="Asunto"><Input value={form.asunto} onChange={(e) => set("asunto", e.target.value)} placeholder="Divorcio, pagaré…" /></Field>
        <Field label="Sucursal"><Select options={sucursales} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
        <Field label="Abogado"><Select options={abogados} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} /></Field>
        <Field label="¿Pagó asesoría?"><Select options={["Sí", "No"]} value={form.pago} onChange={(e) => set("pago", e.target.value)} /></Field>
        <Field label="Monto"><Input value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="500" /></Field>
        <Field label="Status" full><Select options={STATUS_LABELS} value={form.status} onChange={(e) => set("status", e.target.value)} /></Field>
      </Modal>
    </>
  );
}
