"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Bell, ExternalLink, CreditCard, Copy, Check } from "lucide-react";
import Link from "next/link";
import { PageTitle, Card, FilterSelect, SearchBox, OrigenChip } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { useConfirm } from "@/components/confirm";
import { crearMovimientoAction, borrarMovimientoAction } from "./actions";

export type MovimientoView = {
  id: string;
  fecha: string;
  sucursal: string;
  concepto: string;
  expediente: string | null;
  expedienteId: string | null;
  tipo: "Ingreso" | "Egreso";
  monto: number;
  origen: "WhatsApp" | "Web";
};

export type ProximoPagoView = {
  expediente: string;
  expedienteId: string | null;
  cliente: string;
  tipo: string;
  monto: number;
  fechaProxPago: string;
  diasRestantes: number;
};

export type PagoMercadoPagoView = {
  id: string;
  fecha: string;
  cliente: string;
  servicio: string;
  montoBase: number;
  comision: number;
  montoTotal: number;
  estado: string;
  linkPago: string | null;
  externalReference: string;
};

const PLAN_LABELS: Record<string, string> = {
  todo_inicio:  "Todo al inicio",
  inicio_final: "Inicial + Final",
  quincenal:    "Quincenal",
  mensual:      "Mensual",
};
const SERVICIO_LABELS: Record<string, string> = {
  llamada_asesoria: "Llamada de asesoría",
  llamada_no_show: "Llamada de asesoría · reagenda (no asistió)",
  confirmacion_cita: "Confirmación de cita",
  asesoria_promocion: "Asesoría presencial · promoción",
  asesoria_regular: "Asesoría presencial · precio regular",
};
const PAGO_ESTADO: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-wash text-amber" },
  approved: { label: "Aprobado", cls: "bg-success-wash text-success" },
  rejected: { label: "Rechazado", cls: "bg-danger-wash text-danger" },
  cancelled: { label: "Cancelado", cls: "bg-line/60 text-muted" },
  refunded: { label: "Reembolsado", cls: "bg-blue-50 text-blue-700" },
};

const vacio = { tipo: "Ingreso", concepto: "", monto: "", sucursal: "", expediente: "" };
const PRECIOS_COBRO: Record<string, number> = {
  confirmacion_cita: 100,
  llamada_asesoria: 300,
  asesoria_promocion: 500,
  asesoria_regular: 600,
};
const COMISIONES_COBRO: Record<string, number> = {
  confirmacion_cita: 10,
  llamada_asesoria: 15,
  asesoria_promocion: 0,
  asesoria_regular: 0,
};
function comisionAutomatica(servicio: string) {
  return (COMISIONES_COBRO[servicio] ?? 0).toFixed(2);
}
const cobroVacio = { servicio: "llamada_asesoria", comision: comisionAutomatica("llamada_asesoria"), concepto: "", email: "" };

function fmt(n: number) {
  return "$" + n.toLocaleString("es-MX");
}

export default function CajaClient({
  movimientos,
  sucursales,
  proximosPagos,
  pagos,
}: {
  movimientos: MovimientoView[];
  sucursales: string[];
  proximosPagos: ProximoPagoView[];
  pagos: PagoMercadoPagoView[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [fSucursal, setFSucursal] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);
  const [openCobro, setOpenCobro] = useState(false);
  const [formCobro, setFormCobro] = useState(cobroVacio);
  const [generandoCobro, setGenerandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState("");
  const [linkGenerado, setLinkGenerado] = useState("");
  const [copiado, setCopiado] = useState(false);
  const confirmar = useConfirm();
  const router = useRouter();

  function set(c: keyof typeof vacio, v: string) { setForm((f) => ({ ...f, [c]: v })); }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movimientos
      .filter((m) => !q || m.concepto.toLowerCase().includes(q) || (m.expediente ?? "").toLowerCase().includes(q))
      .filter((m) => !fSucursal || m.sucursal === fSucursal);
  }, [movimientos, busqueda, fSucursal]);

  const ingresos = movimientos.filter((m) => m.tipo === "Ingreso").reduce((a, m) => a + m.monto, 0);
  const egresos  = movimientos.filter((m) => m.tipo === "Egreso").reduce((a, m)  => a + m.monto, 0);

  async function borrar(id: string) {
    if (await confirmar({ titulo: "¿Eliminar este movimiento?", peligro: true, confirmLabel: "Eliminar" })) await borrarMovimientoAction(id);
  }
  async function guardar() {
    setSaving(true);
    await crearMovimientoAction({ tipo: form.tipo, monto: Number(form.monto.replace(/[$,]/g, "")) || 0, concepto: form.concepto, sucursal: form.sucursal, expediente: form.expediente });
    setSaving(false);
    setForm(vacio);
    setOpen(false);
  }

  async function generarLink() {
    setGenerandoCobro(true);
    setErrorCobro("");
    setLinkGenerado("");
    try {
      const respuesta = await fetch("/api/pagos/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          servicio: formCobro.servicio,
          comision: Number(formCobro.comision.replace(/[$,]/g, "")),
          concepto: formCobro.concepto || undefined,
          email: formCobro.email || undefined,
        }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || !resultado.ok) throw new Error(resultado.error || "No fue posible generar el enlace.");
      setLinkGenerado(resultado.linkPago);
      router.refresh();
    } catch (error) {
      setErrorCobro(error instanceof Error ? error.message : "No fue posible generar el enlace.");
    } finally {
      setGenerandoCobro(false);
    }
  }

  async function copiarLink() {
    if (!linkGenerado) return;
    await navigator.clipboard.writeText(linkGenerado);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  const mesActual = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <>
      <PageTitle eyebrow="Administración" title="Caja" subtitle={`Cortes y movimientos · ${mesActual}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Ingresos del mes",   valor: fmt(ingresos),          color: "text-success" },
          { label: "Egresos del mes",    valor: fmt(egresos),           color: "text-danger"  },
          { label: "Balance",            valor: fmt(ingresos - egresos), color: "text-ink"    },
          { label: "Sucursales",         valor: String(sucursales.length), color: "text-ink"  },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="eyebrow text-muted">{k.label}</p>
            <p className={`num text-[34px] font-semibold leading-none mt-3 ${k.color}`}>{k.valor}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar concepto o expediente…" />
        <FilterSelect label="Sucursal" value={fSucursal} onChange={setFSucursal} options={sucursales} />
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
              <tr key={m.id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3.5 num">{m.fecha}</td>
                <td className="px-3 py-3.5">{m.sucursal}</td>
                <td className="px-3 py-3.5">{m.concepto}</td>
                <td className="px-3 py-3.5 exp-no text-muted">
                  {m.expediente && m.expedienteId ? (
                    <Link href={`/expedientes/${m.expedienteId}`} className="text-navy hover:underline">
                      {m.expediente}
                    </Link>
                  ) : (
                    m.expediente ?? "—"
                  )}
                </td>
                <td className="px-3 py-3.5"><span className={`font-bold ${m.tipo === "Ingreso" ? "text-success" : "text-danger"}`}>{m.tipo}</span></td>
                <td className="px-3 py-3.5 num text-right font-bold">{fmt(m.monto)}</td>
                <td className="px-3 py-3.5"><OrigenChip origen={m.origen} /></td>
                <td className="px-3 py-3.5 text-right">
                  <button onClick={() => borrar(m.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo movimiento" onSubmit={guardar} submitLabel={saving ? "Guardando…" : "Registrar movimiento"}>
        <Field label="Tipo"><Select options={["Ingreso", "Egreso"]} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} /></Field>
        <Field label="Monto"><Input value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="4500" required /></Field>
        <Field label="Concepto" full><Input value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Corte de caja, honorarios…" /></Field>
        <Field label="Sucursal"><Select options={sucursales} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></Field>
        <Field label="Expediente (opcional)"><Input value={form.expediente} onChange={(e) => set("expediente", e.target.value)} placeholder="EXP-2026-0142" /></Field>
      </Modal>

      <Modal
        open={openCobro}
        onClose={() => { setOpenCobro(false); setErrorCobro(""); setLinkGenerado(""); setFormCobro(cobroVacio); }}
        title="Generar enlace de Mercado Pago"
        onSubmit={generarLink}
        submitLabel={generandoCobro ? "Generando…" : "Generar enlace"}
      >
        <Field label="Servicio" full>
          <select
            className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
            value={formCobro.servicio}
            onChange={(e) => setFormCobro((f) => ({ ...f, servicio: e.target.value, comision: comisionAutomatica(e.target.value) }))}
          >
            <option value="confirmacion_cita">Confirmación de cita · $100</option>
            <option value="llamada_asesoria">Llamada de asesoría · $300</option>
            <option value="asesoria_promocion">Asesoría promoción · $500</option>
            <option value="asesoria_regular">Asesoría regular · $600</option>
          </select>
        </Field>
        <Field label="Comisión incluida en el total">
          <Input
            inputMode="decimal"
            value={formCobro.comision}
            readOnly
          />
        </Field>
        <Field label="Correo del cliente (opcional)">
          <Input type="email" value={formCobro.email} onChange={(e) => setFormCobro((f) => ({ ...f, email: e.target.value }))} placeholder="cliente@correo.com" />
        </Field>
        <Field label="Concepto (opcional)" full>
          <Input value={formCobro.concepto} onChange={(e) => setFormCobro((f) => ({ ...f, concepto: e.target.value }))} placeholder="Nombre del cliente o detalle del cobro" />
        </Field>
        <p className="col-span-full text-[12.5px] text-muted leading-relaxed">
          El total será el precio del servicio más la comisión calculada. El cobro aparecerá en esta tabla y se actualizará automáticamente cuando Mercado Pago confirme la operación.
        </p>
        {errorCobro && <p className="col-span-full rounded-lg bg-danger-wash px-3 py-2 text-[13px] text-danger">{errorCobro}</p>}
        {linkGenerado && (
          <div className="col-span-full rounded-lg border border-success/30 bg-success-wash p-3">
            <p className="text-[12px] font-bold text-success mb-2">Enlace listo para compartir</p>
            <div className="flex items-center gap-2">
              <input readOnly value={linkGenerado} className="min-w-0 flex-1 bg-white border border-line rounded-md px-2.5 py-2 text-[12px]" />
              <button type="button" onClick={copiarLink} className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-[12px] font-bold text-white">
                {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {proximosPagos.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-amber" />
            <h2 className="font-serif text-[17px] text-ink">Próximos pagos de clientes</h2>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="eyebrow text-muted px-5 py-3">Expediente</th>
                  <th className="eyebrow text-muted px-3 py-3">Cliente</th>
                  <th className="eyebrow text-muted px-3 py-3">Plan</th>
                  <th className="eyebrow text-muted px-3 py-3 text-right">Monto</th>
                  <th className="eyebrow text-muted px-3 py-3">Fecha</th>
                  <th className="eyebrow text-muted px-3 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {proximosPagos.map((p, i) => (
                  <tr key={i} className={`transition-colors ${p.diasRestantes < 0 ? "bg-danger-wash/20" : p.diasRestantes <= 3 ? "bg-amber-wash/30" : "hover:bg-paper/60"}`}>
                    <td className="px-5 py-3.5 exp-no font-bold">
                      {p.expedienteId ? (
                        <Link href={`/expedientes/${p.expedienteId}`} className="text-navy hover:underline">
                          {p.expediente}
                        </Link>
                      ) : (
                        p.expediente
                      )}
                    </td>
                    <td className="px-3 py-3.5">{p.cliente}</td>
                    <td className="px-3 py-3.5 text-muted">{PLAN_LABELS[p.tipo] ?? p.tipo}</td>
                    <td className="px-3 py-3.5 num text-right font-bold">{fmt(p.monto)}</td>
                    <td className="px-3 py-3.5 num">{p.fechaProxPago}</td>
                    <td className="px-3 py-3.5">
                      {p.diasRestantes < 0
                        ? <span className="text-[11.5px] font-bold px-2 py-0.5 rounded bg-danger-wash text-danger">Vencido</span>
                        : p.diasRestantes === 0
                        ? <span className="text-[11.5px] font-bold px-2 py-0.5 rounded bg-amber-wash text-amber">Hoy</span>
                        : p.diasRestantes <= 3
                        ? <span className="text-[11.5px] font-bold px-2 py-0.5 rounded bg-amber-wash text-amber">En {p.diasRestantes} días</span>
                        : <span className="text-[11.5px] text-muted">En {p.diasRestantes} días</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-navy" />
          <h2 className="font-serif text-[17px] text-ink">Cobros de Mercado Pago</h2>
          <span className="flex-1" />
          <button onClick={() => setOpenCobro(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
            <CreditCard size={16} /> Generar enlace
          </button>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="eyebrow text-muted px-5 py-3">Fecha</th>
                <th className="eyebrow text-muted px-3 py-3">Cliente</th>
                <th className="eyebrow text-muted px-3 py-3">Servicio</th>
                <th className="eyebrow text-muted px-3 py-3 text-right">Precio base</th>
                <th className="eyebrow text-muted px-3 py-3 text-right">Comisión</th>
                <th className="eyebrow text-muted px-3 py-3 text-right">Total</th>
                <th className="eyebrow text-muted px-3 py-3">Estado</th>
                <th className="eyebrow text-muted px-3 py-3 text-right">Enlace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {pagos.map((p) => {
                const estado = PAGO_ESTADO[p.estado] ?? { label: p.estado, cls: "bg-line/60 text-muted" };
                return (
                  <tr key={p.id} className="hover:bg-paper/60 transition-colors">
                    <td className="px-5 py-3.5 num">{p.fecha}</td>
                    <td className="px-3 py-3.5 font-bold">{p.cliente}</td>
                    <td className="px-3 py-3.5">{SERVICIO_LABELS[p.servicio] ?? p.servicio}</td>
                    <td className="px-3 py-3.5 num text-right">{fmt(p.montoBase)}</td>
                    <td className="px-3 py-3.5 num text-right text-muted">{fmt(p.comision)}</td>
                    <td className="px-3 py-3.5 num text-right font-bold">{fmt(p.montoTotal)}</td>
                    <td className="px-3 py-3.5"><span className={`px-2 py-0.5 rounded text-[11.5px] font-bold ${estado.cls}`}>{estado.label}</span></td>
                    <td className="px-3 py-3.5 text-right">
                      {p.linkPago ? <a href={p.linkPago} target="_blank" rel="noopener noreferrer" title={p.externalReference} className="inline-flex p-1.5 rounded-md text-navy hover:bg-navy/[.06]"><ExternalLink size={15} /></a> : "—"}
                    </td>
                  </tr>
                );
              })}
              {pagos.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">Todavía no hay cobros de Mercado Pago registrados.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
