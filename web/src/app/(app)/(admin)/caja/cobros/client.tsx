"use client";

import { useState } from "react";
import { ExternalLink, CreditCard, Copy, Check } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input } from "@/components/modal";

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

export default function CobrosClient({ pagos }: { pagos: PagoMercadoPagoView[] }) {
  const [openCobro, setOpenCobro] = useState(false);
  const [formCobro, setFormCobro] = useState(cobroVacio);
  const [generandoCobro, setGenerandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState("");
  const [linkGenerado, setLinkGenerado] = useState("");
  const [copiado, setCopiado] = useState(false);

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

  function cerrarModal() {
    // ponytail: recarga completa porque router.refresh() da 503 en este servidor.
    if (linkGenerado) return window.location.reload();
    setOpenCobro(false);
    setErrorCobro("");
    setFormCobro(cobroVacio);
  }

  return (
    <>
      <PageTitle eyebrow="Caja" title="Cobros de Mercado Pago" subtitle="Enlaces generados y su estado de pago" />

      <div className="flex items-center mb-4">
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
              <th className="eyebrow text-muted px-3 py-3">Cliente / concepto</th>
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

      <Modal
        open={openCobro}
        onClose={cerrarModal}
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
          <Input inputMode="decimal" value={formCobro.comision} readOnly />
        </Field>
        <Field label="Correo del cliente (opcional)">
          <Input type="email" value={formCobro.email} onChange={(e) => setFormCobro((f) => ({ ...f, email: e.target.value }))} placeholder="cliente@correo.com" />
        </Field>
        <Field label="Concepto (opcional)" full>
          <Input value={formCobro.concepto} onChange={(e) => setFormCobro((f) => ({ ...f, concepto: e.target.value }))} placeholder="Nombre del cliente o detalle del cobro" />
        </Field>
        <p className="col-span-full text-[12.5px] text-muted leading-relaxed">
          El total será el precio del servicio más la comisión calculada. El cobro aparecerá en esta tabla y se actualizará cuando Mercado Pago confirme la operación (recarga la página para verlo).
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
    </>
  );
}
