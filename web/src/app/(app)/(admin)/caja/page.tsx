"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { movimientos as iniciales, type Movimiento, SUCURSALES } from "@/lib/mock";
import { PageTitle, Card, FilterSelect, SearchBox, OrigenChip } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";

type Row = Movimiento & { _id: string };

function parseMonto(s: string) {
  return Number(s.replace(/[$,]/g, "")) || 0;
}
function fmt(n: number) {
  return "$" + n.toLocaleString("es-MX");
}

const vacio = { tipo: "Ingreso", concepto: "", monto: "", sucursal: "", expediente: "" };

export default function CajaPage() {
  const [lista, setLista] = useState<Row[]>(iniciales.map((m, i) => ({ ...m, _id: `m${i}` })));
  const [busqueda, setBusqueda] = useState("");
  const [fSucursal, setFSucursal] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vacio);

  function set(c: keyof typeof vacio, v: string) {
    setForm((f) => ({ ...f, [c]: v }));
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista
      .filter((m) => !q || m.concepto.toLowerCase().includes(q) || (m.expediente ?? "").toLowerCase().includes(q))
      .filter((m) => !fSucursal || m.sucursal === fSucursal);
  }, [lista, busqueda, fSucursal]);

  const ingresos = lista.filter((m) => m.tipo === "Ingreso").reduce((a, m) => a + parseMonto(m.monto), 0);
  const egresos = lista.filter((m) => m.tipo === "Egreso").reduce((a, m) => a + parseMonto(m.monto), 0);

  const kpis = [
    { label: "Ingresos del mes", valor: fmt(ingresos), color: "text-success" },
    { label: "Egresos del mes", valor: fmt(egresos), color: "text-danger" },
    { label: "Balance", valor: fmt(ingresos - egresos), color: "text-ink" },
    { label: "Sucursales", valor: String(SUCURSALES.length), color: "text-ink" },
  ];

  function borrar(id: string) {
    if (confirm("¿Eliminar este movimiento?")) setLista((l) => l.filter((m) => m._id !== id));
  }
  function guardar() {
    const monto = parseMonto(form.monto);
    const nuevo: Row = {
      _id: `m${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" }),
      sucursal: form.sucursal || "Tuxtla",
      concepto: form.concepto || "Movimiento",
      expediente: form.expediente || null,
      tipo: form.tipo === "Egreso" ? "Egreso" : "Ingreso",
      monto: fmt(monto),
      origen: "Web",
    };
    setLista((l) => [nuevo, ...l]);
    setForm(vacio);
    setOpen(false);
  }

  return (
    <>
      <PageTitle eyebrow="Administración" title="Caja" subtitle="Cortes y movimientos · junio 2026" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="eyebrow text-muted">{k.label}</p>
            <p className={`num text-[34px] font-semibold leading-none mt-3 ${k.color}`}>{k.valor}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar concepto o expediente…" />
        <FilterSelect label="Sucursal" value={fSucursal} onChange={setFSucursal} options={SUCURSALES} />
        <span className="flex-1" />
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
          <Plus size={18} strokeWidth={1.75} /> Nuevo movimiento
        </button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Fecha</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">Concepto</th>
              <th className="eyebrow text-muted px-3 py-3">Expediente</th>
              <th className="eyebrow text-muted px-3 py-3">Tipo</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Monto</th>
              <th className="eyebrow text-muted px-3 py-3">Origen</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {visibles.map((m) => (
              <tr key={m._id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3.5 num">{m.fecha}</td>
                <td className="px-3 py-3.5">{m.sucursal}</td>
                <td className="px-3 py-3.5">{m.concepto}</td>
                <td className="px-3 py-3.5 exp-no text-muted">{m.expediente ?? "—"}</td>
                <td className="px-3 py-3.5"><span className={`font-bold ${m.tipo === "Ingreso" ? "text-success" : "text-danger"}`}>{m.tipo}</span></td>
                <td className="px-3 py-3.5 num text-right font-bold">{m.monto}</td>
                <td className="px-3 py-3.5"><OrigenChip origen={m.origen} /></td>
                <td className="px-3 py-3.5 text-right">
                  <button onClick={() => borrar(m._id)} title="Eliminar" className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo movimiento" onSubmit={guardar} submitLabel="Registrar movimiento">
        <Field label="Tipo"><Select options={["Ingreso", "Egreso"]} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} /></Field>
        <Field label="Monto"><Input value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="4500" required /></Field>
        <Field label="Concepto" full><Input value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Corte de caja, honorarios…" /></Field>
        <Field label="Sucursal"><Select options={SUCURSALES} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
        <Field label="Expediente (opcional)"><Input value={form.expediente} onChange={(e) => set("expediente", e.target.value)} placeholder="EXP-2026-0142" /></Field>
      </Modal>
    </>
  );
}
