"use client";

import { useRef, useState } from "react";
import { MessageCircle, FileText, ExternalLink, UploadCloud, Loader, Link2, Plus, Paperclip, Trash2, Pencil, Check, Receipt, CreditCard } from "lucide-react";
import { useConfirm } from "@/components/confirm";
import {
  agregarDocumentoDriveAction,
  borrarDocumentoAction,
  borrarActuacionAction,
  crearParteAction, editarParteAction, borrarParteAction,
  crearAudienciaAction, editarAudienciaAction, borrarAudienciaAction,
  crearMovimientoAction, borrarMovimientoAction,
  crearTerminoAction, marcarCumplidoTerminoAction, borrarTerminoAction,
  crearGastoAction, borrarGastoAction,
  upsertPlanPagoAction, borrarPlanPagoAction, type FormPlanPago,
} from "@/app/(app)/expedientes/actions";

const TABS = [
  { id: "actuaciones",     label: "Actuaciones"           },
  { id: "partes",          label: "Partes"                },
  { id: "audiencias",      label: "Audiencias"            },
  { id: "terminos",        label: "Términos / Prevenciones" },
  { id: "documentos",      label: "Documentos"            },
  { id: "caja",            label: "Caja"                  },
  { id: "otros_pagos",     label: "Otros tipos de pago"   },
] as const;

type TabId = (typeof TABS)[number]["id"];

export type ActuacionData = {
  id: string;
  tipo: string | null;
  descripcion: string | null;
  fecha: string;
  registradoPor: string | null;
  origen: string;
  documentos: DocumentoData[];
};

export type ParteData = {
  id: string;
  nombre: string;
  rol: string | null;
  contacto: string | null;
};

export type AudienciaData = {
  id: string;
  fechaHora: string;
  fechaHoraRaw: Date;
  tipo: string | null;
  lugar: string | null;
  estado: string;
};

export type DocumentoData = {
  id: string;
  nombre: string;
  tipo: string | null;
  linkDrive: string | null;
  fecha: string;
};

export type MovimientoTabData = {
  id: string;
  fecha: string;
  concepto: string | null;
  tipo: string;
  monto: number;
};

export type TerminoTabData = {
  id: string;
  tipo: string | null;
  descripcion: string | null;
  fechaAcuerdo: string;
  diasParaContestar: number | null;
  vencimientoTermino: string;
  cumplido: boolean;
  diasRestantes: number | null;
};

export type GastoTabData = {
  id: string;
  fecha: string;
  concepto: string;
  beneficiario: string | null;
  monto: number;
};

export type PlanPagoData = {
  id: string;
  tipo: string;
  montoTotal: number;
  montoInicial: number | null;
  montoFinal: number | null;
  montoPeriodico: number | null;
  fechaProxPago: string | null;
  notas: string | null;
} | null;

export function ExpedienteTabs({
  expedienteId,
  actuaciones,
  partes,
  audiencias,
  terminos,
  documentos: documentosIniciales,
  movimientos,
  gastos,
  planPago,
  esAdmin = false,
}: {
  expedienteId: string;
  actuaciones: ActuacionData[];
  partes: ParteData[];
  audiencias: AudienciaData[];
  terminos: TerminoTabData[];
  documentos: DocumentoData[];
  movimientos: MovimientoTabData[];
  gastos: GastoTabData[];
  planPago: PlanPagoData;
  esAdmin?: boolean;
}) {
  const [tab, setTab] = useState<TabId>("actuaciones");
  const tabsVisibles = TABS.filter((t) => (t.id !== "caja" && t.id !== "otros_pagos") || esAdmin);

  return (
    <>
      <div className="px-6 flex gap-1 border-b border-line">
        {tabsVisibles.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-[13.5px] border-b-2 transition-colors ${
              tab === t.id ? "text-ink border-amber font-bold" : "text-muted border-transparent hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "actuaciones" && <Actuaciones data={actuaciones} expedienteId={expedienteId} />}
        {tab === "partes"      && <Partes data={partes} expedienteId={expedienteId} />}
        {tab === "audiencias"  && <Audiencias data={audiencias} expedienteId={expedienteId} />}
        {tab === "terminos"    && <Terminos data={terminos} expedienteId={expedienteId} />}
        {tab === "documentos"  && <Documentos expedienteId={expedienteId} inicial={documentosIniciales} />}
        {tab === "caja"        && <Caja data={movimientos} planPago={planPago} expedienteId={expedienteId} />}
        {tab === "otros_pagos" && <OtrosTiposPago data={gastos} expedienteId={expedienteId} />}
      </div>
    </>
  );
}

function Actuaciones({ data, expedienteId }: { data: ActuacionData[]; expedienteId: string }) {
  const [borrando, setBorrando] = useState<string | null>(null);
  const confirmar = useConfirm();

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar esta actuación?", mensaje: "Esta acción no se puede deshacer.", peligro: true, confirmLabel: "Borrar" }))) return;
    setBorrando(id);
    await borrarActuacionAction(id, expedienteId);
    setBorrando(null);
  }

  if (!data.length) return <p className="text-muted text-[13.5px]">Sin actuaciones registradas.</p>;
  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-line" />
      {data.map((e, i) => (
        <div key={e.id} className={`relative group ${i < data.length - 1 ? "mb-5" : ""}`}>
          <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-paper ${e.origen === "whatsapp" ? "bg-amber" : "bg-navy"}`} />
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-ink">{e.tipo ? capitalize(e.tipo) : "Actuación"}</p>
            {e.origen === "whatsapp" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-success-wash text-success text-[11px] font-bold">
                <MessageCircle size={12} /> WhatsApp
              </span>
            )}
            <button
              onClick={() => borrar(e.id)}
              disabled={borrando === e.id}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-danger disabled:opacity-40"
              title="Borrar actuación"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
          <p className="text-[12.5px] text-muted">
            {e.fecha}
            {e.registradoPor ? ` · ${e.registradoPor}` : ""}
            {e.descripcion ? ` · ${e.descripcion}` : ""}
          </p>
          {e.documentos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {e.documentos.map((d) => (
                <a
                  key={d.id}
                  href={d.linkDrive ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-paper text-[12px] text-navy font-bold hover:border-navy/40 transition-colors"
                >
                  {d.tipo === "drive" ? <Link2 size={12} strokeWidth={2} /> : <Paperclip size={12} strokeWidth={2} />}
                  <span className="max-w-[180px] truncate">{d.nombre}</span>
                  <ExternalLink size={11} className="text-muted shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const ROLES_PARTE = ["actor", "demandado", "tercero", "abogado_contrario"];

function Partes({ data: inicial, expedienteId }: { data: ParteData[]; expedienteId: string }) {
  const [data, setData] = useState(inicial);
  const [form, setForm] = useState({ nombre: "", rol: "", contacto: "" });
  const [editando, setEditando] = useState<ParteData | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();

  function abrirNueva() { setForm({ nombre: "", rol: "", contacto: "" }); setEditando(null); setOpen(true); }
  function abrirEditar(p: ParteData) { setForm({ nombre: p.nombre, rol: p.rol ?? "", contacto: p.contacto ?? "" }); setEditando(p); setOpen(true); }
  function cerrar() { setOpen(false); setEditando(null); }

  async function guardar() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    if (editando) {
      await editarParteAction(editando.id, expedienteId, form);
      setData((prev) => prev.map((p) => p.id === editando.id ? { ...p, ...form, rol: form.rol || null, contacto: form.contacto || null } : p));
    } else {
      await crearParteAction(expedienteId, form);
      setData((prev) => [...prev, { id: `tmp-${Date.now()}`, nombre: form.nombre, rol: form.rol || null, contacto: form.contacto || null }]);
    }
    setSaving(false);
    cerrar();
  }

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar esta parte?", peligro: true, confirmLabel: "Borrar" }))) return;
    await borrarParteAction(id, expedienteId);
    setData((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={abrirNueva} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={15} strokeWidth={2} /> Agregar parte
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-muted text-[13.5px]">Sin partes registradas.</p>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-2 py-2.5">Nombre</th>
              <th className="eyebrow text-muted px-2 py-2.5">Rol</th>
              <th className="eyebrow text-muted px-2 py-2.5">Contacto</th>
              <th className="px-2 py-2.5 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {data.map((p) => (
              <tr key={p.id} className="group">
                <td className="px-2 py-3 font-bold">{p.nombre}</td>
                <td className="px-2 py-3">{p.rol ? capitalize(p.rol.replace(/_/g, " ")) : "—"}</td>
                <td className="px-2 py-3 num text-muted">{p.contacto ?? "—"}</td>
                <td className="px-2 py-3">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button onClick={() => abrirEditar(p)} className="text-muted hover:text-navy"><Pencil size={14} strokeWidth={1.75} /></button>
                    <button onClick={() => borrar(p.id)} className="text-muted hover:text-danger"><Trash2 size={14} strokeWidth={1.75} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <MiniModal title={editando ? "Editar parte" : "Nueva parte"} onClose={cerrar} onSubmit={guardar} submitLabel={saving ? "Guardando…" : editando ? "Guardar" : "Agregar"}>
          <MiniField label="Nombre *">
            <MiniInput value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" autoFocus />
          </MiniField>
          <MiniField label="Rol">
            <MiniSelect options={ROLES_PARTE} value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))} />
          </MiniField>
          <MiniField label="Contacto (teléfono/email)">
            <MiniInput value={form.contacto} onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))} placeholder="55 1234 5678" />
          </MiniField>
        </MiniModal>
      )}
    </>
  );
}

const TIPOS_AUDIENCIA = ["inicial", "pruebas", "desahogo", "alegatos", "sentencia", "otra"];
const ESTADOS_AUDIENCIA = ["programada", "realizada", "diferida"];

function fmtLocalDatetime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function Audiencias({ data: inicial, expedienteId }: { data: AudienciaData[]; expedienteId: string }) {
  const [data, setData] = useState(inicial);
  const [form, setForm] = useState({ fechaHora: "", tipo: "", lugar: "", estado: "programada" });
  const [editando, setEditando] = useState<AudienciaData | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();

  function abrirNueva() { setForm({ fechaHora: "", tipo: "", lugar: "", estado: "programada" }); setEditando(null); setOpen(true); }
  function abrirEditar(a: AudienciaData) {
    setForm({ fechaHora: fmtLocalDatetime(a.fechaHoraRaw), tipo: a.tipo ?? "", lugar: a.lugar ?? "", estado: a.estado });
    setEditando(a); setOpen(true);
  }
  function cerrar() { setOpen(false); setEditando(null); }

  async function guardar() {
    if (!form.fechaHora) return;
    setSaving(true);
    if (editando) {
      await editarAudienciaAction(editando.id, expedienteId, form);
      setData((prev) => prev.map((a) => a.id === editando.id
        ? { ...a, fechaHora: new Date(form.fechaHora).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), fechaHoraRaw: new Date(form.fechaHora), tipo: form.tipo || null, lugar: form.lugar || null, estado: form.estado }
        : a));
    } else {
      await crearAudienciaAction(expedienteId, form);
      const nueva: AudienciaData = {
        id: `tmp-${Date.now()}`,
        fechaHora: new Date(form.fechaHora).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        fechaHoraRaw: new Date(form.fechaHora),
        tipo: form.tipo || null, lugar: form.lugar || null, estado: form.estado,
      };
      setData((prev) => [nueva, ...prev]);
    }
    setSaving(false);
    cerrar();
  }

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar esta audiencia?", peligro: true, confirmLabel: "Borrar" }))) return;
    await borrarAudienciaAction(id, expedienteId);
    setData((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={abrirNueva} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={15} strokeWidth={2} /> Agregar audiencia
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-muted text-[13.5px]">Sin audiencias registradas.</p>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-2 py-2.5">Fecha y hora</th>
              <th className="eyebrow text-muted px-2 py-2.5">Tipo</th>
              <th className="eyebrow text-muted px-2 py-2.5">Lugar</th>
              <th className="eyebrow text-muted px-2 py-2.5">Estado</th>
              <th className="px-2 py-2.5 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {data.map((a) => (
              <tr key={a.id} className="group">
                <td className="px-2 py-3 num">{a.fechaHora}</td>
                <td className="px-2 py-3">{a.tipo ?? "—"}</td>
                <td className="px-2 py-3 text-muted">{a.lugar ?? "—"}</td>
                <td className="px-2 py-3">
                  <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${a.estado === "realizada" ? "bg-success-wash text-success" : a.estado === "diferida" ? "bg-danger-wash/50 text-danger" : "bg-navy/[.08] text-navy"}`}>
                    {capitalize(a.estado)}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button onClick={() => abrirEditar(a)} className="text-muted hover:text-navy"><Pencil size={14} strokeWidth={1.75} /></button>
                    <button onClick={() => borrar(a.id)} className="text-muted hover:text-danger"><Trash2 size={14} strokeWidth={1.75} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <MiniModal title={editando ? "Editar audiencia" : "Nueva audiencia"} onClose={cerrar} onSubmit={guardar} submitLabel={saving ? "Guardando…" : editando ? "Guardar" : "Agregar"}>
          <MiniField label="Fecha y hora *">
            <MiniInput type="datetime-local" value={form.fechaHora} onChange={(e) => setForm((f) => ({ ...f, fechaHora: e.target.value }))} autoFocus />
          </MiniField>
          <MiniField label="Tipo">
            <MiniSelect options={TIPOS_AUDIENCIA} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} />
          </MiniField>
          <MiniField label="Lugar">
            <MiniInput value={form.lugar} onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))} placeholder="Juzgado / sala…" />
          </MiniField>
          <MiniField label="Estado">
            <MiniSelect options={ESTADOS_AUDIENCIA} value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))} />
          </MiniField>
        </MiniModal>
      )}
    </>
  );
}

const TIPOS_TERMINO = ["termino", "emplazamiento", "contestacion", "pruebas", "apelacion", "otro"];

function fmtDateLocal(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function Terminos({ data: inicial, expedienteId }: { data: TerminoTabData[]; expedienteId: string }) {
  const [data, setData] = useState(inicial);
  const [form, setForm] = useState({ tipo: "", descripcion: "", fechaAcuerdo: "", diasParaContestar: "", vencimientoTermino: "" });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();

  function cerrar() { setOpen(false); setForm({ tipo: "", descripcion: "", fechaAcuerdo: "", diasParaContestar: "", vencimientoTermino: "" }); }

  async function guardar() {
    if (!form.vencimientoTermino) return;
    setSaving(true);
    await crearTerminoAction(expedienteId, form);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const vence = new Date(form.vencimientoTermino);
    const dias = Math.round((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    setData((prev) => [...prev, {
      id: `tmp-${Date.now()}`,
      tipo: form.tipo || null,
      descripcion: form.descripcion || null,
      fechaAcuerdo: form.fechaAcuerdo ? fmtDateLocal(form.fechaAcuerdo) : "—",
      diasParaContestar: form.diasParaContestar ? parseInt(form.diasParaContestar) : null,
      vencimientoTermino: fmtDateLocal(form.vencimientoTermino),
      cumplido: false,
      diasRestantes: dias,
    }]);
    setSaving(false);
    cerrar();
  }

  async function marcarCumplido(id: string) {
    await marcarCumplidoTerminoAction(id, expedienteId);
    setData((prev) => prev.map((t) => t.id === id ? { ...t, cumplido: true, diasRestantes: null } : t));
  }

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar este término?", peligro: true, confirmLabel: "Borrar" }))) return;
    await borrarTerminoAction(id, expedienteId);
    setData((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={15} strokeWidth={2} /> Agregar término
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-muted text-[13.5px]">Sin términos registrados.</p>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-2 py-2.5">Tipo</th>
              <th className="eyebrow text-muted px-2 py-2.5">Descripción</th>
              <th className="eyebrow text-muted px-2 py-2.5">Acuerdo</th>
              <th className="eyebrow text-muted px-2 py-2.5">Días</th>
              <th className="eyebrow text-muted px-2 py-2.5">Vence</th>
              <th className="eyebrow text-muted px-2 py-2.5">Estado</th>
              <th className="px-2 py-2.5 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {data.map((t) => (
              <tr key={t.id} className="group">
                <td className="px-2 py-3">{t.tipo ? capitalize(t.tipo) : "—"}</td>
                <td className="px-2 py-3 text-muted">{t.descripcion ?? "—"}</td>
                <td className="px-2 py-3 num text-muted">{t.fechaAcuerdo}</td>
                <td className="px-2 py-3 num text-muted">{t.diasParaContestar ?? "—"}</td>
                <td className="px-2 py-3 num font-bold">{t.vencimientoTermino}</td>
                <td className="px-2 py-3">
                  {t.cumplido ? (
                    <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-success-wash text-success">Cumplido</span>
                  ) : t.diasRestantes !== null ? (
                    <span className={`px-2 py-0.5 rounded text-[12px] font-bold num ${t.diasRestantes < 0 ? "bg-danger-wash/50 text-danger" : t.diasRestantes <= 3 ? "bg-amber/20 text-amber" : "bg-navy/[.08] text-navy"}`}>
                      {t.diasRestantes < 0 ? "Venció" : t.diasRestantes === 0 ? "¡Hoy!" : `${t.diasRestantes}d`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-navy/[.08] text-navy">Activo</span>
                  )}
                </td>
                <td className="px-2 py-3">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    {!t.cumplido && (
                      <button onClick={() => marcarCumplido(t.id)} title="Marcar cumplido" className="text-muted hover:text-success">
                        <Check size={14} strokeWidth={2} />
                      </button>
                    )}
                    <button onClick={() => borrar(t.id)} className="text-muted hover:text-danger"><Trash2 size={14} strokeWidth={1.75} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <MiniModal title="Nuevo término" onClose={cerrar} onSubmit={guardar} submitLabel={saving ? "Guardando…" : "Agregar"}>
          <MiniField label="Tipo">
            <MiniSelect options={TIPOS_TERMINO} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} />
          </MiniField>
          <MiniField label="Fecha de acuerdo">
            <MiniInput type="date" value={form.fechaAcuerdo} onChange={(e) => setForm((f) => ({ ...f, fechaAcuerdo: e.target.value }))} />
          </MiniField>
          <MiniField label="Días para contestar">
            <MiniInput type="number" min="1" value={form.diasParaContestar} onChange={(e) => setForm((f) => ({ ...f, diasParaContestar: e.target.value }))} placeholder="p.ej. 9" />
          </MiniField>
          <MiniField label="Vencimiento *">
            <MiniInput type="date" value={form.vencimientoTermino} onChange={(e) => setForm((f) => ({ ...f, vencimientoTermino: e.target.value }))} autoFocus />
          </MiniField>
          <MiniField label="Descripción" full>
            <MiniInput value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Ej. Plazo para contestar demanda" />
          </MiniField>
        </MiniModal>
      )}
    </>
  );
}

function Documentos({ expedienteId, inicial }: { expedienteId: string; inicial: DocumentoData[] }) {
  const [docs, setDocs] = useState<(DocumentoData & { subiendo?: boolean })[]>(inicial);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveNombre, setDriveNombre] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [driveGuardando, setDriveGuardando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const confirmar = useConfirm();

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar este documento?", mensaje: "Esta acción no se puede deshacer.", peligro: true, confirmLabel: "Borrar" }))) return;
    setBorrando(id);
    await borrarDocumentoAction(id, expedienteId);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setBorrando(null);
  }

  async function manejar(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") { alert("Solo se permiten archivos PDF."); continue; }
      const placeholder = { id: `tmp-${Date.now()}`, nombre: file.name, tipo: "pdf", linkDrive: null, fecha: hoy(), subiendo: true };
      setDocs((prev) => [placeholder, ...prev]);

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/expedientes/${expedienteId}/documentos`, { method: "POST", body: fd });

      if (res.ok) {
        const saved: DocumentoData = await res.json();
        setDocs((prev) => prev.map((d) => (d.id === placeholder.id ? saved : d)));
      } else {
        alert("Error al subir el archivo.");
        setDocs((prev) => prev.filter((d) => d.id !== placeholder.id));
      }
    }
  }

  async function guardarDrive() {
    if (!driveUrl.trim()) return;
    setDriveGuardando(true);
    const saved = await agregarDocumentoDriveAction(
      expedienteId,
      driveNombre.trim() || "Documento de Drive",
      driveUrl.trim(),
    );
    setDocs((prev) => [saved, ...prev]);
    setDriveNombre("");
    setDriveUrl("");
    setDriveOpen(false);
    setDriveGuardando(false);
  }

  return (
    <>
      {/* Upload PDF */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); manejar(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed px-6 py-7 text-center cursor-pointer transition-colors mb-3 ${
          drag ? "border-navy/60 bg-paper" : "border-line bg-paper/40 hover:border-navy/40 hover:bg-paper"
        }`}
      >
        <div className="w-11 h-11 mx-auto rounded-full bg-navy/[.08] flex items-center justify-center text-navy">
          <UploadCloud size={18} strokeWidth={1.75} />
        </div>
        <p className="text-[14px] font-bold text-ink mt-3">
          Arrastra un PDF aquí o <span className="text-navy underline decoration-amber/60 underline-offset-2">haz clic para seleccionar</span>
        </p>
        <p className="text-[12px] text-muted mt-1">Solo archivos PDF · máximo 500 MB</p>
        <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden"
          onChange={(e) => { manejar(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Agregar link de Drive */}
      {!driveOpen ? (
        <button
          onClick={() => setDriveOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-line bg-paper/40 text-[13px] text-muted hover:text-navy hover:border-navy/30 transition-colors mb-4"
        >
          <Link2 size={15} strokeWidth={1.75} />
          Agregar link de Google Drive
        </button>
      ) : (
        <div className="rounded-xl border border-navy/20 bg-navy/[.03] p-4 mb-4">
          <p className="eyebrow text-muted mb-3">Agregar documento de Drive</p>
          <div className="space-y-2">
            <input
              value={driveNombre}
              onChange={(e) => setDriveNombre(e.target.value)}
              placeholder="Nombre del documento (opcional)"
              className="w-full px-3 py-2 rounded-lg bg-white border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
            />
            <input
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="URL de Google Drive…"
              className="w-full px-3 py-2 rounded-lg bg-white border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
              autoFocus
            />
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              type="button"
              onClick={() => { setDriveOpen(false); setDriveNombre(""); setDriveUrl(""); }}
              className="px-3 py-1.5 text-[13px] text-muted hover:text-ink transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardarDrive}
              disabled={driveGuardando || !driveUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
            >
              <Plus size={14} /> {driveGuardando ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 && <p className="text-center text-muted text-[13.5px] py-4">Sin documentos. Sube el primero o agrega un link de Drive.</p>}

      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className={`group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${d.subiendo ? "border-navy/30 bg-paper/40" : "border-line hover:border-navy/30"}`}>
            {d.tipo === "drive" ? (
              <Link2 size={18} strokeWidth={1.75} className="text-amber shrink-0" />
            ) : (
              <FileText size={18} strokeWidth={1.75} className="text-navy shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold truncate">{d.nombre}</p>
              <p className="text-[11.5px] text-muted">{d.tipo === "drive" ? "Google Drive" : "PDF"} · {d.fecha}</p>
            </div>
            {d.subiendo ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-amber font-bold shrink-0">
                <Loader size={16} className="animate-spin" /> Subiendo…
              </span>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {d.linkDrive && (
                  <a href={d.linkDrive} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-navy font-bold cursor-pointer">
                    <ExternalLink size={16} /> Abrir
                  </a>
                )}
                <button
                  onClick={() => borrar(d.id)}
                  disabled={borrando === d.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-danger disabled:opacity-40"
                  title="Borrar documento"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

const PLAN_LABELS: Record<string, string> = {
  todo_inicio:    "Pagó todo al inicio",
  inicio_final:   "Pago inicial + pago final",
  quincenal:      "Pago inicial + pagos quincenales",
  mensual:        "Pago inicial + pagos mensuales",
};

function PlanPagoSection({ planPago, expedienteId }: { planPago: PlanPagoData; expedienteId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormPlanPago>({
    tipo: planPago?.tipo ?? "todo_inicio",
    montoTotal: planPago?.montoTotal ? String(planPago.montoTotal) : "",
    montoInicial: planPago?.montoInicial ? String(planPago.montoInicial) : "",
    montoFinal: planPago?.montoFinal ? String(planPago.montoFinal) : "",
    montoPeriodico: planPago?.montoPeriodico ? String(planPago.montoPeriodico) : "",
    fechaProxPago: planPago?.fechaProxPago ?? "",
    notas: planPago?.notas ?? "",
  });
  const confirmar = useConfirm();
  const mostrarFinal = form.tipo === "inicio_final";
  const mostrarPeriodico = form.tipo === "quincenal" || form.tipo === "mensual";

  async function guardar() {
    setSaving(true);
    await upsertPlanPagoAction(expedienteId, form);
    setSaving(false);
    setOpen(false);
  }
  async function borrar() {
    if (await confirmar({ titulo: "¿Quitar el plan de pago?", peligro: true, confirmLabel: "Quitar" })) {
      await borrarPlanPagoAction(expedienteId);
    }
  }

  return (
    <div className="mt-6 pt-5 border-t border-line">
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-2 text-[13px] font-bold text-ink"><CreditCard size={15} /> Plan de pago del cliente</p>
        <div className="flex gap-2">
          {planPago && <button onClick={borrar} className="text-[12px] text-muted hover:text-danger transition-colors">Quitar</button>}
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-line text-[12px] font-bold hover:border-navy/40 transition-colors">
            <Pencil size={12} /> {planPago ? "Editar" : "Configurar"}
          </button>
        </div>
      </div>

      {planPago ? (
        <div className="rounded-lg border border-line bg-paper/40 p-4 text-[13px] space-y-2">
          <p className="font-bold text-ink">{PLAN_LABELS[planPago.tipo] ?? planPago.tipo}</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div><p className="eyebrow text-muted">Monto total</p><p className="num font-bold">${planPago.montoTotal.toLocaleString("es-MX")}</p></div>
            {planPago.montoInicial && <div><p className="eyebrow text-muted">Pago inicial</p><p className="num font-bold">${planPago.montoInicial.toLocaleString("es-MX")}</p></div>}
            {planPago.montoFinal && <div><p className="eyebrow text-muted">Pago final</p><p className="num font-bold">${planPago.montoFinal.toLocaleString("es-MX")}</p></div>}
            {planPago.montoPeriodico && <div><p className="eyebrow text-muted">Pago periódico</p><p className="num font-bold">${planPago.montoPeriodico.toLocaleString("es-MX")}</p></div>}
            {planPago.fechaProxPago && <div><p className="eyebrow text-muted">Próximo pago</p><p className="num font-bold text-amber">{planPago.fechaProxPago}</p></div>}
          </div>
          {planPago.notas && <p className="text-muted mt-2">{planPago.notas}</p>}
        </div>
      ) : (
        <p className="text-muted text-[13px]">Sin plan de pago configurado.</p>
      )}

      {open && (
        <MiniModal title="Plan de pago" onClose={() => setOpen(false)} onSubmit={guardar} submitLabel={saving ? "Guardando…" : "Guardar plan"}>
          <MiniField label="Tipo de plan" full>
            <MiniSelect options={["todo_inicio", "inicio_final", "quincenal", "mensual"]} labels={PLAN_LABELS} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} />
          </MiniField>
          <MiniField label="Monto total ($) *">
            <MiniInput type="number" min="0" step="0.01" value={form.montoTotal} onChange={(e) => setForm((f) => ({ ...f, montoTotal: e.target.value }))} placeholder="0.00" />
          </MiniField>
          <MiniField label="Pago inicial ($)">
            <MiniInput type="number" min="0" step="0.01" value={form.montoInicial} onChange={(e) => setForm((f) => ({ ...f, montoInicial: e.target.value }))} placeholder="0.00" />
          </MiniField>
          {mostrarFinal && (
            <MiniField label="Pago final ($)">
              <MiniInput type="number" min="0" step="0.01" value={form.montoFinal} onChange={(e) => setForm((f) => ({ ...f, montoFinal: e.target.value }))} placeholder="0.00" />
            </MiniField>
          )}
          {mostrarPeriodico && (
            <MiniField label={`Monto por pago ${form.tipo === "quincenal" ? "quincenal" : "mensual"} ($)`}>
              <MiniInput type="number" min="0" step="0.01" value={form.montoPeriodico} onChange={(e) => setForm((f) => ({ ...f, montoPeriodico: e.target.value }))} placeholder="0.00" />
            </MiniField>
          )}
          {(mostrarFinal || mostrarPeriodico) && (
            <MiniField label="Fecha próximo pago">
              <MiniInput type="date" value={form.fechaProxPago} onChange={(e) => setForm((f) => ({ ...f, fechaProxPago: e.target.value }))} />
            </MiniField>
          )}
          <MiniField label="Notas" full>
            <MiniInput value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} placeholder="Observaciones del acuerdo…" />
          </MiniField>
        </MiniModal>
      )}
    </div>
  );
}

function Caja({ data: inicial, planPago, expedienteId }: { data: MovimientoTabData[]; planPago: PlanPagoData; expedienteId: string }) {
  const [data, setData] = useState(inicial);
  const [form, setForm] = useState({ tipo: "ingreso", concepto: "", monto: "", fecha: hoy() });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();

  function cerrar() { setOpen(false); setForm({ tipo: "ingreso", concepto: "", monto: "", fecha: hoy() }); }

  async function guardar() {
    if (!form.monto || isNaN(parseFloat(form.monto))) return;
    setSaving(true);
    await crearMovimientoAction(expedienteId, form);
    setData((prev) => [{
      id: `tmp-${Date.now()}`,
      fecha: new Date(form.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }),
      concepto: form.concepto || null,
      tipo: form.tipo,
      monto: parseFloat(form.monto),
    }, ...prev]);
    setSaving(false);
    cerrar();
  }

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar este movimiento?", peligro: true, confirmLabel: "Borrar" }))) return;
    await borrarMovimientoAction(id, expedienteId);
    setData((prev) => prev.filter((m) => m.id !== id));
  }

  const total = data.reduce((acc, m) => acc + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[13px] font-bold ${total >= 0 ? "text-success" : "text-danger"}`}>
          Saldo: ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </p>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={15} strokeWidth={2} /> Registrar movimiento
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-muted text-[13.5px]">Sin movimientos registrados.</p>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-2 py-2.5">Fecha</th>
              <th className="eyebrow text-muted px-2 py-2.5">Concepto</th>
              <th className="eyebrow text-muted px-2 py-2.5">Tipo</th>
              <th className="eyebrow text-muted px-2 py-2.5 text-right">Monto</th>
              <th className="px-2 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {data.map((m) => (
              <tr key={m.id} className="group">
                <td className="px-2 py-3 num">{m.fecha}</td>
                <td className="px-2 py-3">{m.concepto ?? "—"}</td>
                <td className="px-2 py-3">
                  <span className={`font-bold ${m.tipo === "ingreso" ? "text-success" : "text-danger"}`}>
                    {capitalize(m.tipo)}
                  </span>
                </td>
                <td className="px-2 py-3 num text-right font-bold">${m.monto.toLocaleString("es-MX")}</td>
                <td className="px-2 py-3">
                  <button onClick={() => borrar(m.id)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <MiniModal title="Nuevo movimiento" onClose={cerrar} onSubmit={guardar} submitLabel={saving ? "Guardando…" : "Registrar"}>
          <MiniField label="Tipo">
            <MiniSelect options={["ingreso", "egreso"]} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} />
          </MiniField>
          <MiniField label="Fecha">
            <MiniInput type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
          </MiniField>
          <MiniField label="Concepto" full>
            <MiniInput value={form.concepto} onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))} placeholder="Honorarios, gastos…" autoFocus />
          </MiniField>
          <MiniField label="Monto ($) *" full>
            <MiniInput type="number" min="0" step="0.01" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} placeholder="0.00" />
          </MiniField>
        </MiniModal>
      )}

      <PlanPagoSection planPago={planPago} expedienteId={expedienteId} />
    </>
  );
}

function OtrosTiposPago({ data: inicial, expedienteId }: { data: GastoTabData[]; expedienteId: string }) {
  const [data, setData] = useState(inicial);
  const [form, setForm] = useState({ fecha: hoy(), concepto: "", beneficiario: "", monto: "" });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirmar = useConfirm();

  function cerrar() { setOpen(false); setForm({ fecha: hoy(), concepto: "", beneficiario: "", monto: "" }); }

  async function guardar() {
    if (!form.concepto.trim() || !form.monto) return;
    setSaving(true);
    await crearGastoAction(expedienteId, form);
    setData((prev) => [{
      id: `tmp-${Date.now()}`,
      fecha: new Date(form.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }),
      concepto: form.concepto,
      beneficiario: form.beneficiario || null,
      monto: parseFloat(form.monto),
    }, ...prev]);
    setSaving(false);
    cerrar();
  }

  async function borrar(id: string) {
    if (!(await confirmar({ titulo: "¿Borrar este gasto?", peligro: true, confirmLabel: "Borrar" }))) return;
    await borrarGastoAction(id, expedienteId);
    setData((prev) => prev.filter((g) => g.id !== id));
  }

  const total = data.reduce((acc, g) => acc + g.monto, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Receipt size={15} className="text-muted" />
          <p className="text-[13px] font-bold text-ink">Gastos externos del expediente</p>
          {data.length > 0 && (
            <span className="text-[12px] text-danger font-bold num">Total: ${total.toLocaleString("es-MX")}</span>
          )}
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={15} strokeWidth={2} /> Registrar gasto
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-muted text-[13.5px]">Sin gastos registrados (peritos, notarios, servicios externos, etc.).</p>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-2 py-2.5">Fecha</th>
              <th className="eyebrow text-muted px-2 py-2.5">Concepto</th>
              <th className="eyebrow text-muted px-2 py-2.5">Pagado a</th>
              <th className="eyebrow text-muted px-2 py-2.5 text-right">Monto</th>
              <th className="px-2 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {data.map((g) => (
              <tr key={g.id} className="group">
                <td className="px-2 py-3 num">{g.fecha}</td>
                <td className="px-2 py-3 font-medium">{g.concepto}</td>
                <td className="px-2 py-3 text-muted">{g.beneficiario ?? "—"}</td>
                <td className="px-2 py-3 num text-right font-bold text-danger">${g.monto.toLocaleString("es-MX")}</td>
                <td className="px-2 py-3">
                  <button onClick={() => borrar(g.id)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <MiniModal title="Registrar gasto" onClose={cerrar} onSubmit={guardar} submitLabel={saving ? "Guardando…" : "Registrar"}>
          <MiniField label="Fecha">
            <MiniInput type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
          </MiniField>
          <MiniField label="Concepto *" full>
            <MiniInput value={form.concepto} onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))} placeholder="Perito informático, notaría…" autoFocus required />
          </MiniField>
          <MiniField label="Pagado a (persona/empresa)" full>
            <MiniInput value={form.beneficiario} onChange={(e) => setForm((f) => ({ ...f, beneficiario: e.target.value }))} placeholder="Nombre del perito, empresa…" />
          </MiniField>
          <MiniField label="Monto ($) *" full>
            <MiniInput type="number" min="0" step="0.01" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} placeholder="0.00" />
          </MiniField>
        </MiniModal>
      )}
    </>
  );
}

// ── Mini Modal (inline, para los tabs) ───────────────────────────────────────

function MiniModal({ title, children, onClose, onSubmit, submitLabel = "Guardar" }: {
  title: string; children: React.ReactNode;
  onClose: () => void; onSubmit: () => void; submitLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[8vh]" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-line shadow-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-serif text-[17px] text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-[22px] leading-none">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="px-5 py-4 grid grid-cols-2 gap-3">{children}</div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-line">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-lg border border-line text-[13px] hover:border-navy/40 transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const miniFieldCls = "w-full px-3 py-2 rounded-lg bg-white border border-line text-[13px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition";

function MiniField({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "col-span-2" : ""}>
      <span className="eyebrow text-muted block mb-1">{label}</span>
      {children}
    </label>
  );
}

function MiniInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={miniFieldCls} />;
}

function MiniSelect({ options, labels, ...props }: { options: string[]; labels?: Record<string, string> } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={miniFieldCls}>
      <option value="">Seleccionar…</option>
      {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? capitalize(o.replace(/_/g, " "))}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function hoy() { return new Date().toISOString().split("T")[0]; }
