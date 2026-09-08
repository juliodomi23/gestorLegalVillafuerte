"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { PageTitle, Card, SearchBox, FilterSelect } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { useConfirm } from "@/components/confirm";
import {
  crearDiligenciaAction,
  borrarDiligenciaAction,
  agregarRenglonAction,
  borrarRenglonAction,
  cambiarEstadoPagoAction,
  type FormRenglon,
  type EstadoPagoDiligencia,
} from "./actions";

export type DiligenciaView = {
  id: string;
  fecha: string; // dd/mm/yyyy
  folio: string | null;
  cliente: string;
  sucursal: string;
  abogado: string;
  estadoPago: EstadoPagoDiligencia;
  renglones: { id: string; fecha: string; descripcion: string; asunto: string; importe: number }[];
};

const estadoPagoInfo: Record<EstadoPagoDiligencia, { label: string; cls: string }> = {
  pendiente:   { label: "Por regresarle", cls: "bg-amber-wash text-amber" },
  reembolsado: { label: "Ya se le regresó", cls: "bg-success-wash text-success" },
  en_nomina:   { label: "En su nómina", cls: "bg-line/60 text-muted" },
};

function hoy() {
  return new Date().toISOString().split("T")[0];
}

function totalDe(d: DiligenciaView) {
  return d.renglones.reduce((s, r) => s + r.importe, 0);
}

const vacioRenglon: FormRenglon = { fecha: hoy(), descripcion: "", asunto: "", importe: "" };
const vacioNueva = { cliente: "", sucursal: "", abogado: "", renglones: [{ ...vacioRenglon }] };

// Renglones dentro del formulario de "Nueva diligencia" (fila editable, sin guardar
// hasta enviar el formulario completo — a diferencia de FilaRenglones, que sí guarda
// al vuelo porque edita una diligencia que ya existe).
function RenglonesForm({ renglones, onChange }: { renglones: FormRenglon[]; onChange: (r: FormRenglon[]) => void }) {
  function set(i: number, campo: keyof FormRenglon, v: string) {
    onChange(renglones.map((r, idx) => (idx === i ? { ...r, [campo]: v } : r)));
  }
  function quitar(i: number) {
    onChange(renglones.filter((_, idx) => idx !== i));
  }
  const total = renglones.reduce((s, r) => s + (parseFloat(r.importe) || 0), 0);

  return (
    <div className="col-span-full">
      <span className="eyebrow text-muted block mb-1.5">Conceptos</span>
      <div className="space-y-2">
        {renglones.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_110px_28px] gap-1.5 items-center">
            <Input value={r.descripcion} onChange={(e) => set(i, "descripcion", e.target.value)} placeholder="Se fue al juzgado a..." autoFocus={i === 0} />
            <Input value={r.asunto} onChange={(e) => set(i, "asunto", e.target.value)} placeholder="Copias, viáticos..." />
            <Input type="number" min="0" step="0.01" value={r.importe} onChange={(e) => set(i, "importe", e.target.value)} placeholder="$0.00" />
            <button
              type="button"
              onClick={() => quitar(i)}
              disabled={renglones.length === 1}
              className="text-muted hover:text-danger disabled:opacity-30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <button type="button" onClick={() => onChange([...renglones, { ...vacioRenglon }])} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-navy hover:text-navy-deep transition-colors">
          <Plus size={14} strokeWidth={2} /> Agregar otro concepto
        </button>
        <span className="text-[13px] font-bold text-ink">Total: ${total.toLocaleString("es-MX")}</span>
      </div>
    </div>
  );
}

function FilaRenglones({ diligencia }: { diligencia: DiligenciaView }) {
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(vacioRenglon);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();
  const router = useRouter();

  async function guardar() {
    if (!form.importe) return;
    setSaving(true);
    await agregarRenglonAction(diligencia.id, form);
    setSaving(false);
    setOpenForm(false);
    setForm(vacioRenglon);
    router.refresh();
  }

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar este renglón?", peligro: true, confirmLabel: "Borrar" }))) return;
    await borrarRenglonAction(id);
    router.refresh();
  }

  return (
    <tr>
      <td colSpan={9} className="bg-paper/40 px-5 py-4">
        {diligencia.renglones.length > 0 && (
          <table className="w-full text-[12.5px] mb-3">
            <thead>
              <tr className="text-left border-b border-line/70">
                <th className="eyebrow text-muted py-1.5 pr-3">Fecha</th>
                <th className="eyebrow text-muted py-1.5 pr-3">Descripción</th>
                <th className="eyebrow text-muted py-1.5 pr-3">Asunto</th>
                <th className="eyebrow text-muted py-1.5 pr-3 text-right">Importe</th>
                <th className="py-1.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {diligencia.renglones.map((r) => (
                <tr key={r.id} className="group">
                  <td className="py-2 pr-3 num text-muted">{r.fecha}</td>
                  <td className="py-2 pr-3">{r.descripcion || "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r.asunto || "—"}</td>
                  <td className="py-2 pr-3 num text-right font-bold">${r.importe.toLocaleString("es-MX")}</td>
                  <td className="py-2">
                    <button onClick={() => borrar(r.id)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {openForm ? (
          <div className="grid grid-cols-4 gap-2 items-end">
            <label className="text-[11.5px]">
              <span className="eyebrow text-muted block mb-1">Fecha</span>
              <Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
            </label>
            <label className="text-[11.5px]">
              <span className="eyebrow text-muted block mb-1">Descripción</span>
              <Input value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Se fue al juzgado a..." autoFocus />
            </label>
            <label className="text-[11.5px]">
              <span className="eyebrow text-muted block mb-1">Asunto</span>
              <Input value={form.asunto} onChange={(e) => setForm((f) => ({ ...f, asunto: e.target.value }))} placeholder="Copias, viáticos..." />
            </label>
            <label className="text-[11.5px]">
              <span className="eyebrow text-muted block mb-1">Importe ($)</span>
              <div className="flex gap-1.5">
                <Input type="number" min="0" step="0.01" value={form.importe} onChange={(e) => setForm((f) => ({ ...f, importe: e.target.value }))} placeholder="0.00" />
                <button onClick={guardar} disabled={saving} className="shrink-0 px-3 py-2 rounded-lg bg-navy text-white text-[12px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-50">
                  {saving ? "..." : "OK"}
                </button>
              </div>
            </label>
          </div>
        ) : (
          <button onClick={() => setOpenForm(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-navy hover:text-navy-deep transition-colors">
            <Plus size={14} strokeWidth={2} /> Agregar renglón
          </button>
        )}
      </td>
    </tr>
  );
}

export default function DiligenciasClient({
  diligencias,
  sucursales,
  abogados,
  sesionNombre,
  sesionRol,
}: {
  diligencias: DiligenciaView[];
  sucursales: string[];
  abogados: string[];
  sesionNombre: string;
  sesionRol: string;
}) {
  const puedeAsignar = sesionRol === "asistente" || sesionRol === "admin";
  const [busqueda, setBusqueda] = useState("");
  const [fSucursal, setFSucursal] = useState("");
  const [fAbogado, setFAbogado] = useState("");
  const [open, setOpen] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [form, setForm] = useState(vacioNueva);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();
  const router = useRouter();

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return diligencias
      .filter((d) => !q || d.cliente.toLowerCase().includes(q) || (d.folio ?? "").includes(q))
      .filter((d) => !fSucursal || d.sucursal === fSucursal)
      .filter((d) => !fAbogado || d.abogado === fAbogado);
  }, [diligencias, busqueda, fSucursal, fAbogado]);

  const totalGeneral = useMemo(() => filtradas.reduce((s, d) => s + totalDe(d), 0), [filtradas]);

  function abrirNuevo() {
    setForm({ ...vacioNueva, renglones: [{ ...vacioRenglon }], abogado: puedeAsignar ? "" : sesionNombre });
    setOpen(true);
  }

  async function guardar() {
    setSaving(true);
    try {
      const id = await crearDiligenciaAction(form);
      setOpen(false);
      setExpandido(id);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function borrar(id: string) {
    if (await confirmar({ titulo: "¿Eliminar esta diligencia?", peligro: true, confirmLabel: "Eliminar" })) {
      await borrarDiligenciaAction(id);
      router.refresh();
    }
  }

  return (
    <>
      <PageTitle eyebrow="Despacho" title="Diligencias" subtitle="Trámites y salidas de campo, con folio por sucursal" />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <p className="eyebrow text-muted">Diligencias</p>
          <p className="num text-[34px] font-semibold leading-none mt-3 text-ink">{filtradas.length}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow text-muted">Total gastado</p>
          <p className="num text-[34px] font-semibold leading-none mt-3 text-danger">${totalGeneral.toLocaleString("es-MX")}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar por cliente o folio…" />
        <FilterSelect label="Sucursal" value={fSucursal} onChange={setFSucursal} options={sucursales} />
        <FilterSelect label="Abogado" value={fAbogado} onChange={setFAbogado} options={abogados} />
        <span className="flex-1" />
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={18} strokeWidth={1.75} /> Nueva diligencia
        </button>
      </div>

      {filtradas.length === 0 ? (
        <Card className="p-10 text-center text-muted text-[14px]">Sin diligencias registradas.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-left bg-paper/60">
                  <th className="eyebrow text-muted px-3 py-2.5 w-8" />
                  <th className="eyebrow text-muted px-3 py-2.5">Folio</th>
                  <th className="eyebrow text-muted px-3 py-2.5">Fecha</th>
                  <th className="eyebrow text-muted px-5 py-2.5">Cliente</th>
                  <th className="eyebrow text-muted px-3 py-2.5">Sucursal</th>
                  <th className="eyebrow text-muted px-3 py-2.5">Abogado</th>
                  <th className="eyebrow text-muted px-3 py-2.5 text-right">Total</th>
                  <th className="eyebrow text-muted px-3 py-2.5">Reembolso</th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filtradas.map((d) => {
                  const abierto = expandido === d.id;
                  return (
                    <Fragment key={d.id}>
                      <tr className="hover:bg-paper/40 transition-colors group">
                        <td className="px-3 py-3">
                          <button onClick={() => setExpandido(abierto ? null : d.id)} className="text-muted hover:text-ink">
                            {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-3 py-3 num text-muted">{d.folio ?? "—"}</td>
                        <td className="px-3 py-3 num text-muted">{d.fecha}</td>
                        <td className="px-5 py-3 font-bold text-ink">{d.cliente}</td>
                        <td className="px-3 py-3 text-muted">{d.sucursal || "—"}</td>
                        <td className="px-3 py-3 text-muted">{d.abogado || "—"}</td>
                        <td className="px-3 py-3 num text-right font-bold">${totalDe(d).toLocaleString("es-MX")}</td>
                        <td className="px-3 py-3">
                          {/* <select> nativo: un dropdown propio dentro de la tabla se recortaba con
                              el overflow-x-auto de la tabla (se veía apachurado). El del navegador
                              siempre se posiciona bien, sin depender del contenedor. */}
                          <select
                            value={d.estadoPago}
                            onChange={async (e) => {
                              await cambiarEstadoPagoAction(d.id, e.target.value as EstadoPagoDiligencia);
                              router.refresh();
                            }}
                            className={`px-2 py-1 rounded text-[11.5px] font-bold cursor-pointer border-0 hover:opacity-80 transition-opacity ${estadoPagoInfo[d.estadoPago].cls}`}
                          >
                            {(Object.entries(estadoPagoInfo) as [EstadoPagoDiligencia, { label: string; cls: string }][]).map(([key, info]) => (
                              <option key={key} value={key}>{info.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => borrar(d.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash opacity-0 group-hover:opacity-100 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                      {abierto && <FilaRenglones diligencia={d} />}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva diligencia" onSubmit={guardar} submitLabel={saving ? "Guardando…" : "Registrar"}>
        <Field label="Cliente" full>
          <Input value={form.cliente} onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))} placeholder="Nombre del cliente" autoFocus required />
        </Field>
        <Field label="Sucursal">
          <Select options={sucursales} value={form.sucursal} onChange={(e) => setForm((f) => ({ ...f, sucursal: e.target.value }))} required />
        </Field>
        {puedeAsignar ? (
          <Field label="Abogado">
            <Select options={abogados} value={form.abogado} onChange={(e) => setForm((f) => ({ ...f, abogado: e.target.value }))} required />
          </Field>
        ) : (
          <Field label="Abogado">
            <Input value={sesionNombre} disabled />
          </Field>
        )}
        <RenglonesForm renglones={form.renglones} onChange={(renglones) => setForm((f) => ({ ...f, renglones }))} />
      </Modal>
    </>
  );
}
