"use client";

import { useState, useMemo } from "react";
import { Plus, ChevronDown, ChevronRight, MessageCircle, FileText, Pencil, Trash2, ExternalLink } from "lucide-react";
import { type Asesoria, type StatusAsesoria, SUCURSALES, ABOGADOS } from "@/lib/mock";
import { PageTitle, Card, SearchBox, FilterSelect } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";

// Mock ampliado — varias sucursales y días
const MOCK_ASESORIAS: (Asesoria & { _id: string })[] = [
  // Tuxtla — 09/06
  { _id: "a1",  fecha: "09/06/2026", nombre: "Laura Méndez",      telefono: "961 111 2233", asunto: "Divorcio",              sucursal: "Tuxtla",         abogado: "Ana",       pago: true,  monto: "$500", status: "contrato_firmado", url_doc: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUGDnELy3/view" },
  { _id: "a2",  fecha: "09/06/2026", nombre: "Roberto Cruz",       telefono: "961 222 4455", asunto: "Pagaré",               sucursal: "Tuxtla",         abogado: "Christian", pago: true,  monto: "$500", status: "pendiente"        },
  { _id: "a3",  fecha: "09/06/2026", nombre: "Patricia Luna",      telefono: "961 333 5566", asunto: "Pensión alimenticia",  sucursal: "Tuxtla",         abogado: "Ana",       pago: false, monto: "—",    status: "pendiente",        url_doc: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUGDnELy3/view" },
  // Tuxtla — 08/06
  { _id: "a4",  fecha: "08/06/2026", nombre: "Carmen Ruiz",        telefono: "961 777 8899", asunto: "Arrendamiento",        sucursal: "Tuxtla",         abogado: "Ana",       pago: true,  monto: "$500", status: "contrato_firmado", url_doc: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUGDnELy3/view" },
  { _id: "a5",  fecha: "08/06/2026", nombre: "Ernesto Velázquez",  telefono: "961 888 1122", asunto: "Despido",              sucursal: "Tuxtla",         abogado: "Christian", pago: false, monto: "—",    status: "no_regreso"       },
  // Tuxtla — 07/06
  { _id: "a6",  fecha: "07/06/2026", nombre: "Silvia Morales",     telefono: "961 444 9900", asunto: "Herencia",             sucursal: "Tuxtla",         abogado: "Ana",       pago: true,  monto: "$500", status: "pendiente"        },
  // San Cristóbal — 09/06
  { _id: "a7",  fecha: "09/06/2026", nombre: "Miguel Torres",      telefono: "961 222 3344", asunto: "Pensión alimenticia",  sucursal: "San Cristóbal",  abogado: "Christian", pago: true,  monto: "$500", status: "pendiente",        url_doc: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUGDnELy3/view" },
  { _id: "a8",  fecha: "09/06/2026", nombre: "Daniela Espinoza",   telefono: "961 555 7788", asunto: "Divorcio",             sucursal: "San Cristóbal",  abogado: "Christian", pago: false, monto: "—",    status: "pendiente"        },
  // San Cristóbal — 07/06
  { _id: "a9",  fecha: "07/06/2026", nombre: "Antonio Méndez",     telefono: "961 666 3312", asunto: "Mercantil",            sucursal: "San Cristóbal",  abogado: "Christian", pago: true,  monto: "$500", status: "contrato_firmado" },
  // Tapachula — 09/06
  { _id: "a10", fecha: "09/06/2026", nombre: "José Hernández",     telefono: "961 444 5566", asunto: "Despido injustificado",sucursal: "Tapachula",      abogado: "Christian", pago: true,  monto: "$500", status: "pendiente",        url_doc: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUGDnELy3/view" },
  // Tapachula — 08/06
  { _id: "a11", fecha: "08/06/2026", nombre: "Gabriela Fuentes",   telefono: "961 111 6677", asunto: "Pagaré",               sucursal: "Tapachula",      abogado: "Christian", pago: true,  monto: "$500", status: "contrato_firmado" },
  // Villaflores — 08/06
  { _id: "a12", fecha: "08/06/2026", nombre: "Ramón Castillo",     telefono: "961 333 8800", asunto: "Arrendamiento",        sucursal: "Villaflores",    abogado: "Ana",       pago: false, monto: "—",    status: "descartado"       },
  // Comitán — 07/06
  { _id: "a13", fecha: "07/06/2026", nombre: "Sofía Aguilar",      telefono: "961 555 6677", asunto: "Laboral",              sucursal: "Comitán",        abogado: "Ana",       pago: false, monto: "—",    status: "pendiente"        },
];

type Row = Asesoria & { _id: string };

const statusInfo: Record<StatusAsesoria, { label: string; cls: string }> = {
  pendiente:         { label: "Pendiente",         cls: "bg-amber-wash text-amber" },
  contrato_firmado:  { label: "Contrato firmado",  cls: "bg-success-wash text-success" },
  no_regreso:        { label: "No regresó",         cls: "bg-line/60 text-muted" },
  descartado:        { label: "Descartado",         cls: "bg-danger-wash text-danger" },
};
const STATUS_LABELS = ["Pendiente", "Contrato firmado", "No regresó", "Descartado"];
const labelToStatus: Record<string, StatusAsesoria> = {
  "Pendiente": "pendiente", "Contrato firmado": "contrato_firmado", "No regresó": "no_regreso", "Descartado": "descartado",
};

const TABS = ["Todas", ...SUCURSALES];
const vacio = { nombre: "", telefono: "", asunto: "", sucursal: "", abogado: "", pago: "No", monto: "", status: "Pendiente" };

function montoNum(m: string) {
  const n = parseInt(m.replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function formatFecha(f: string) {
  // "09/06/2026" → "Lunes 9 de junio 2026"
  const [d, m, y] = f.split("/").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function DaySection({ fecha, rows, onEdit, onDelete }: {
  fecha: string;
  rows: Row[];
  onEdit: (r: Row) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const pagaron = rows.filter((r) => r.pago);
  const total = pagaron.reduce((s, r) => s + montoNum(r.monto), 0);

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-3">
      {/* Cabecera del día */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 bg-paper/60 hover:bg-paper transition-colors text-left"
      >
        {open
          ? <ChevronDown size={16} className="text-muted shrink-0" />
          : <ChevronRight size={16} className="text-muted shrink-0" />
        }
        <span className="font-serif text-[15px] text-ink capitalize flex-1">{formatFecha(fecha)}</span>
        <span className="text-[12px] text-muted num mr-3">{rows.length} asesoría{rows.length !== 1 ? "s" : ""}</span>
        {total > 0 && (
          <span className="text-[12px] font-bold text-success num">${total.toLocaleString("es-MX")} recaudado</span>
        )}
      </button>

      {/* Tabla */}
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
                <tr key={a._id} className="hover:bg-paper/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-bold text-ink">{a.nombre}</p>
                    <p className="text-[11.5px] num text-muted">{a.telefono}</p>
                  </td>
                  <td className="px-3 py-3 text-ink">{a.asunto}</td>
                  <td className="px-3 py-3 text-muted">{a.abogado}</td>
                  <td className="px-3 py-3">
                    {a.pago
                      ? <span className="text-success font-bold num">{a.monto}</span>
                      : <span className="text-muted">No</span>
                    }
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11.5px] font-bold ${statusInfo[a.status].cls}`}>
                      {statusInfo[a.status].label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {a.url_doc
                        ? <a href={a.url_doc} target="_blank" rel="noopener noreferrer" title="Ver documento en Drive" className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        : <span className="p-1.5 w-[30px]" />
                      }
                      <button onClick={() => onEdit(a)} className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(a._id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors">
                        <Trash2 size={14} />
                      </button>
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

export default function AsesoriasPage() {
  const [lista, setLista] = useState<Row[]>(MOCK_ASESORIAS);
  const [tabActiva, setTabActiva] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [fAbogado, setFAbogado] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fFecha, setFFecha] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);

  function set(c: keyof typeof vacio, v: string) {
    setForm((f) => ({ ...f, [c]: v }));
  }

  // KPIs globales del mes
  const totalMes = lista.length;
  const firmaronMes = lista.filter((a) => a.status === "contrato_firmado").length;
  const conversionMes = totalMes ? Math.round((firmaronMes / totalMes) * 100) : 0;
  const ingresosAsesoria = lista.filter((a) => a.pago).reduce((s, a) => s + montoNum(a.monto), 0);

  // Filtrar por tab + búsqueda + abogado + status + fecha
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista
      .filter((a) => tabActiva === "Todas" || a.sucursal === tabActiva)
      .filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.asunto.toLowerCase().includes(q))
      .filter((a) => !fAbogado || a.abogado === fAbogado)
      .filter((a) => !fStatus || statusInfo[a.status].label === fStatus)
      .filter((a) => !fFecha || a.fecha === fFecha);
  }, [lista, tabActiva, busqueda, fAbogado, fStatus, fFecha]);

  // Agrupar por día (desc)
  const porDia = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const a of filtradas) {
      const grupo = map.get(a.fecha) ?? [];
      grupo.push(a);
      map.set(a.fecha, grupo);
    }
    // ordenar fechas desc: "dd/mm/yyyy"
    const sorted = [...map.entries()].sort(([fa], [fb]) => {
      const parse = (s: string) => {
        const [d, m, y] = s.split("/").map(Number);
        return new Date(y, m - 1, d).getTime();
      };
      return parse(fb) - parse(fa);
    });
    return sorted;
  }, [filtradas]);

  // Conteo por sucursal para badges de tabs
  const cuentaSucursal = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = lista.filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.asunto.toLowerCase().includes(q));
    return Object.fromEntries(TABS.map((t) => [t, t === "Todas" ? base.length : base.filter((a) => a.sucursal === t).length]));
  }, [lista, busqueda]);

  function abrirNuevo() {
    setEditId(null);
    setForm({ ...vacio, sucursal: tabActiva !== "Todas" ? tabActiva : "" });
    setOpen(true);
  }
  function abrirEditar(a: Row) {
    setEditId(a._id);
    setForm({ nombre: a.nombre, telefono: a.telefono, asunto: a.asunto, sucursal: a.sucursal, abogado: a.abogado, pago: a.pago ? "Sí" : "No", monto: a.pago ? a.monto : "", status: statusInfo[a.status].label });
    setOpen(true);
  }
  function borrar(id: string) {
    if (confirm("¿Eliminar esta asesoría?")) setLista((l) => l.filter((a) => a._id !== id));
  }
  function guardar() {
    const pago = form.pago === "Sí";
    const status = labelToStatus[form.status] ?? "pendiente";
    if (editId) {
      setLista((l) => l.map((a) => a._id === editId ? { ...a, nombre: form.nombre, telefono: form.telefono || "—", asunto: form.asunto, sucursal: form.sucursal || a.sucursal, abogado: form.abogado || a.abogado, pago, monto: pago ? form.monto || "$500" : "—", status } : a));
    } else {
      const nueva: Row = {
        _id: `a${Date.now()}`,
        fecha: new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "/"),
        nombre: form.nombre, telefono: form.telefono || "—", asunto: form.asunto,
        sucursal: form.sucursal || "Tuxtla", abogado: form.abogado || "Christian",
        pago, monto: pago ? form.monto || "$500" : "—", status,
      };
      setLista((l) => [nueva, ...l]);
    }
    setOpen(false);
  }

  return (
    <>
      <PageTitle eyebrow="Clientes" title="Asesorías" subtitle="Prospectos por sucursal y día" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Prospectos del mes", valor: String(totalMes),                   color: "text-ink"     },
          { label: "Contratos firmados",  valor: String(firmaronMes),                color: "text-success" },
          { label: "Conversión",          valor: `${conversionMes}%`,               color: "text-navy"    },
          { label: "Recaudado asesorías", valor: `$${ingresosAsesoria.toLocaleString("es-MX")}`, color: "text-ink" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="eyebrow text-muted">{k.label}</p>
            <p className={`num text-[34px] font-semibold leading-none mt-3 ${k.color}`}>{k.valor}</p>
          </Card>
        ))}
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar prospecto o asunto…" />
        <FilterSelect label="Abogado"  value={fAbogado} onChange={setFAbogado} options={ABOGADOS}      />
        <FilterSelect label="Status"   value={fStatus}  onChange={setFStatus}  options={STATUS_LABELS} />
        <input
          type="date"
          value={fFecha ? fFecha.split("/").reverse().join("-") : ""}
          onChange={(e) => {
            if (!e.target.value) { setFFecha(""); return; }
            const [y, m, d] = e.target.value.split("-");
            setFFecha(`${d}/${m}/${y}`);
          }}
          className={`px-3 py-2 rounded-lg border text-[13px] cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-navy/20 ${
            fFecha ? "border-navy/40 bg-navy/[.04] text-navy font-bold" : "border-line bg-surface text-ink hover:border-navy/40"
          }`}
        />
        <span className="flex-1" />
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={18} strokeWidth={1.75} /> Nueva asesoría
        </button>
      </div>

      {/* Tabs de sucursal */}
      <div className="flex gap-1 mb-5 border-b border-line overflow-x-auto">
        {TABS.map((tab) => {
          const activa = tabActiva === tab;
          const n = cuentaSucursal[tab] ?? 0;
          return (
            <button
              key={tab}
              onClick={() => setTabActiva(tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                activa
                  ? "border-amber text-amber"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab}
              {n > 0 && (
                <span className={`text-[11px] rounded-full px-1.5 py-0.5 leading-none ${activa ? "bg-amber text-white" : "bg-line text-muted"}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido agrupado por día */}
      {porDia.length === 0 && (
        <Card className="p-10 text-center text-muted text-[14px]">
          Sin asesorías para esta sucursal.
        </Card>
      )}

      {porDia.map(([fecha, rows]) => (
        <DaySection
          key={fecha}
          fecha={fecha}
          rows={rows}
          onEdit={abrirEditar}
          onDelete={borrar}
        />
      ))}

      {/* Pie */}
      {porDia.length > 0 && (
        <p className="text-[12px] text-muted mt-2 flex items-center gap-1.5">
          <MessageCircle size={13} className="text-success" />
          Las asesorías entran automáticamente cuando el bot registra un prospecto nuevo.
          <FileText size={13} className="text-muted ml-2" />
          Los PDFs viven en Google Drive y se abrirán aquí cuando estén conectados.
        </p>
      )}

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar asesoría" : "Nueva asesoría"} onSubmit={guardar} submitLabel={editId ? "Guardar cambios" : "Registrar asesoría"}>
        <Field label="Nombre del prospecto" full>
          <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre completo" required />
        </Field>
        <Field label="Teléfono">
          <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="961 123 4567" />
        </Field>
        <Field label="Asunto">
          <Input value={form.asunto} onChange={(e) => set("asunto", e.target.value)} placeholder="Divorcio, pagaré…" />
        </Field>
        <Field label="Sucursal">
          <Select options={SUCURSALES} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} />
        </Field>
        <Field label="Abogado">
          <Select options={ABOGADOS} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} />
        </Field>
        <Field label="¿Pagó asesoría?">
          <Select options={["Sí", "No"]} value={form.pago} onChange={(e) => set("pago", e.target.value)} />
        </Field>
        <Field label="Monto">
          <Input value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="$500" />
        </Field>
        <Field label="Status" full>
          <Select options={STATUS_LABELS} value={form.status} onChange={(e) => set("status", e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
