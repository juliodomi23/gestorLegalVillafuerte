"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Upload, Loader, Pencil, CalendarClock, ExternalLink, Eye, X, User, StickyNote, Plus } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { guardarPlanAction } from "./actions";
import { crearExpedienteAction, crearClienteRapidoAction } from "@/app/(app)/expedientes/actions";
import { ETIQUETA_PLAN, type ContratoView } from "@/lib/services/contratos";
import { MATERIAS, ETAPAS } from "@/lib/constants";

const TIPOS = ["todo_inicio", "inicio_final", "quincenal", "mensual"];
const ETIQUETAS = TIPOS.map((t) => ETIQUETA_PLAN[t]);

const expedienteVacio = { clienteNombre: "", clienteTel: "", materia: "", etapa: "", abogado: "", sucursal: "" };

const pesos = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const planVacio = {
  expedienteId: "",
  tipo: "",
  montoTotal: "",
  montoInicial: "",
  montoPeriodico: "",
  fechaProxPago: "",
  notas: "",
};

export default function ContratosClient({
  contratos,
  expedientes,
  sucursales,
  abogados,
  esAdmin,
  sesionNombre,
}: {
  contratos: ContratoView[];
  expedientes: { id: string; etiqueta: string }[];
  sucursales: string[];
  abogados: string[];
  esAdmin: boolean;
  sesionNombre: string;
}) {
  const router = useRouter();
  const inputArchivo = useRef<HTMLInputElement>(null);

  const [subiendo, setSubiendo] = useState(false);
  const [expedienteSubida, setExpedienteSubida] = useState("");
  const [abiertoPlan, setAbiertoPlan] = useState(false);
  const [form, setForm] = useState(planVacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [verDetalle, setVerDetalle] = useState<ContratoView | null>(null);

  const [abiertoExpediente, setAbiertoExpediente] = useState(false);
  const [formExp, setFormExp] = useState({ ...expedienteVacio, abogado: esAdmin ? "" : sesionNombre });
  const [creandoExp, setCreandoExp] = useState(false);
  const [errorExp, setErrorExp] = useState("");

  const setExp = (c: keyof typeof expedienteVacio, v: string) => setFormExp((f) => ({ ...f, [c]: v }));

  const set = (c: keyof typeof planVacio, v: string) => setForm((f) => ({ ...f, [c]: v }));

  async function crearExpedienteRapido() {
    if (!formExp.clienteNombre.trim() || !formExp.materia || !formExp.abogado || !formExp.sucursal) {
      setErrorExp("Completa cliente, materia, abogado y sucursal");
      return;
    }
    setErrorExp("");
    setCreandoExp(true);
    try {
      const cliente = await crearClienteRapidoAction(formExp.clienteNombre.trim(), formExp.clienteTel.trim() || undefined);
      const exp = await crearExpedienteAction({
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        numeroJudicial: "",
        materia: formExp.materia,
        etapa: formExp.etapa,
        abogado: formExp.abogado,
        sucursal: formExp.sucursal,
        rolCliente: "",
        cuantia: "",
      });
      setAbiertoExpediente(false);
      setFormExp({ ...expedienteVacio, abogado: esAdmin ? "" : sesionNombre });
      setAviso("Expediente creado. Ya puedes subir su contrato.");
      router.refresh();
      if (exp) setExpedienteSubida(`${exp.numeroInterno} — ${cliente.nombre}`);
    } catch (e) {
      setErrorExp(e instanceof Error ? e.message : "No se pudo crear el expediente");
    }
    setCreandoExp(false);
  }

  async function subirContrato(archivo: File) {
    const expedienteId = expedientes.find((e) => e.etiqueta === expedienteSubida)?.id;
    if (!expedienteId) {
      setError("Elige primero a qué expediente pertenece el contrato");
      return;
    }
    setError("");
    setAviso("");
    setSubiendo(true);
    const datos = new FormData();
    datos.append("file", archivo);
    datos.append("tipo", "contrato");
    const res = await fetch(`/api/expedientes/${expedienteId}/documentos`, {
      method: "POST",
      body: datos,
    });
    setSubiendo(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo subir el contrato");
      return;
    }
    setAviso("Contrato subido. Ahora registra su plan de pagos para que los cobros entren al calendario.");
    router.refresh();
  }

  function abrirPlan(c: ContratoView) {
    setError("");
    setAviso("");
    setForm({
      expedienteId: c.expedienteId,
      tipo: c.plan ? ETIQUETA_PLAN[c.plan.tipo] ?? "" : "",
      montoTotal: c.plan ? String(c.plan.montoTotal) : "",
      montoInicial: c.plan?.montoInicial ? String(c.plan.montoInicial) : "",
      montoPeriodico: c.plan?.montoPeriodico ? String(c.plan.montoPeriodico) : "",
      fechaProxPago: c.plan?.fechaProxPago ?? "",
      notas: c.plan?.notas ?? "",
    });
    setAbiertoPlan(true);
  }

  async function guardarPlan() {
    setError("");
    setGuardando(true);
    const tipoClave = TIPOS.find((t) => ETIQUETA_PLAN[t] === form.tipo) ?? "";
    const r = await guardarPlanAction({ ...form, tipo: tipoClave });
    setGuardando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAbiertoPlan(false);
    setAviso(
      r.eventoCreado
        ? "Plan guardado. El próximo pago ya quedó en el calendario del despacho."
        : "Plan guardado. No se agendó recordatorio: revisa que la fecha del próximo pago sea futura."
    );
    router.refresh();
  }

  const sinPlan = contratos.filter((c) => !c.plan).length;

  return (
    <>
      <PageTitle
        eyebrow="Despacho"
        title="Contratos"
        subtitle={`${contratos.length} contrato${contratos.length === 1 ? "" : "s"} registrado${
          contratos.length === 1 ? "" : "s"
        }${sinPlan > 0 ? ` · ${sinPlan} sin plan de pagos` : ""}`}
      />

      <Card className="p-5 mb-5">
        <h3 className="font-serif text-[17px] mb-1">Subir un contrato</h3>
        <p className="text-[12.5px] text-muted mb-4">
          PDF de hasta 25 MB, ligado al expediente del cliente.
        </p>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="min-w-[280px] flex-1">
            <span className="eyebrow text-muted block mb-1.5">Expediente</span>
            <Select
              options={expedientes.map((e) => e.etiqueta)}
              value={expedienteSubida}
              onChange={(e) => setExpedienteSubida(e.target.value)}
            />
          </div>
          <button
            onClick={() => setAbiertoExpediente(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-line text-[13px] font-bold text-navy hover:border-navy/40 transition-colors"
          >
            <Plus size={15} /> Cliente sin expediente
          </button>
          <input
            ref={inputArchivo}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subirContrato(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => inputArchivo.current?.click()}
            disabled={subiendo || !expedienteSubida}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-white text-[13.5px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-50"
          >
            {subiendo ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
            {subiendo ? "Subiendo…" : "Elegir PDF"}
          </button>
        </div>
      </Card>

      {error && (
        <p className="text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2 mb-4">{error}</p>
      )}
      {aviso && (
        <p className="text-[13px] text-success bg-success-wash rounded-lg px-3 py-2 mb-4">{aviso}</p>
      )}

      <Card className="overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-line">
          <h3 className="font-serif text-[17px]">Contratos y sus pagos</h3>
          <p className="text-[12.5px] text-muted mt-0.5">
            Al registrar un plan con más de un pago, el siguiente cobro entra al calendario
            del despacho.
          </p>
        </div>
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Expediente</th>
              <th className="eyebrow text-muted px-3 py-3">Cliente</th>
              <th className="eyebrow text-muted px-3 py-3">Contrato</th>
              <th className="eyebrow text-muted px-3 py-3">Plan</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Total</th>
              <th className="eyebrow text-muted px-3 py-3">Próximo pago</th>
              <th className="eyebrow text-muted px-3 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {contratos.map((c) => (
              <tr key={c.documentoId} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3 num font-bold">
                  <Link href={`/expedientes/${c.expedienteId}`} className="text-navy hover:underline">
                    {c.numeroExpediente}
                  </Link>
                </td>
                <td className="px-3 py-3">{c.cliente}</td>
                <td className="px-3 py-3">
                  {c.link ? (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-navy hover:underline inline-flex items-center gap-1.5"
                    >
                      <FileText size={14} /> {c.subidoEl}
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-muted">{c.subidoEl}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {c.plan ? (
                    c.plan.etiqueta
                  ) : (
                    <span className="text-amber font-bold">Sin registrar</span>
                  )}
                </td>
                <td className="px-3 py-3 num text-right">
                  {c.plan ? pesos(c.plan.montoTotal) : "—"}
                </td>
                <td className="px-3 py-3 num text-muted">
                  {c.plan?.fechaProxPago ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock size={13} /> {c.plan.fechaProxPago}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 text-muted">{c.abogado}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setVerDetalle(c)}
                      title="Ver detalles"
                      aria-label="Ver detalles"
                      className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => abrirPlan(c)}
                      title="Plan de pagos"
                      aria-label="Plan de pagos"
                      className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contratos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted">
                  Todavía no hay contratos subidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        open={abiertoPlan}
        onClose={() => setAbiertoPlan(false)}
        title="Plan de pagos"
        onSubmit={guardarPlan}
        submitLabel={guardando ? "Guardando…" : "Guardar plan"}
      >
        <p className="col-span-full text-[12.5px] text-muted -mt-1">
          Si el contrato tiene más de un pago, pon la fecha del siguiente: se agenda solo en
          el calendario del despacho.
        </p>
        <Field label="Tipo de plan">
          <Select options={ETIQUETAS} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} />
        </Field>
        <Field label="Monto total">
          <Input value={form.montoTotal} onChange={(e) => set("montoTotal", e.target.value)} placeholder="15000" />
        </Field>
        <Field label="Pago inicial (opcional)">
          <Input value={form.montoInicial} onChange={(e) => set("montoInicial", e.target.value)} placeholder="5000" />
        </Field>
        <Field label="Monto de cada pago (opcional)">
          <Input
            value={form.montoPeriodico}
            onChange={(e) => set("montoPeriodico", e.target.value)}
            placeholder="2500"
          />
        </Field>
        <Field label="Fecha del próximo pago">
          <Input type="date" value={form.fechaProxPago} onChange={(e) => set("fechaProxPago", e.target.value)} />
        </Field>
        <Field label="Notas" full>
          <Input value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Acordado con el cliente…" />
        </Field>
        {error && (
          <p className="col-span-full text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2">{error}</p>
        )}
      </Modal>

      <Modal
        open={abiertoExpediente}
        onClose={() => setAbiertoExpediente(false)}
        title="Cliente sin expediente"
        onSubmit={crearExpedienteRapido}
        submitLabel={creandoExp ? "Creando…" : "Crear expediente"}
      >
        <p className="col-span-full text-[12.5px] text-muted -mt-1">
          Para un contrato de un cliente que todavía no tiene expediente: crea el cliente y un
          expediente mínimo, y ya puedes subirle el contrato arriba.
        </p>
        <Field label="Nombre del cliente"><Input value={formExp.clienteNombre} onChange={(e) => setExp("clienteNombre", e.target.value)} placeholder="Nombre completo" autoFocus /></Field>
        <Field label="Teléfono (opcional)"><Input value={formExp.clienteTel} onChange={(e) => setExp("clienteTel", e.target.value)} placeholder="961 123 4567" /></Field>
        <Field label="Materia *"><Select options={MATERIAS} value={formExp.materia} onChange={(e) => setExp("materia", e.target.value)} /></Field>
        <Field label="Etapa procesal"><Select options={ETAPAS} value={formExp.etapa} onChange={(e) => setExp("etapa", e.target.value)} /></Field>
        {esAdmin && <Field label="Abogado responsable *"><Select options={abogados} value={formExp.abogado} onChange={(e) => setExp("abogado", e.target.value)} /></Field>}
        <Field label="Sucursal *"><Select options={sucursales} value={formExp.sucursal} onChange={(e) => setExp("sucursal", e.target.value)} /></Field>
        {errorExp && (
          <p className="col-span-full text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2">{errorExp}</p>
        )}
      </Modal>

      {verDetalle && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[8vh]" onClick={() => setVerDetalle(null)}>
          <div className="bg-surface rounded-xl border border-line shadow-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div>
                <p className="eyebrow text-muted">{verDetalle.numeroExpediente}</p>
                <h3 className="font-serif text-[19px] text-ink">{verDetalle.cliente}</h3>
              </div>
              <button onClick={() => setVerDetalle(null)} aria-label="Cerrar" className="text-muted hover:text-ink transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="divide-y divide-line/60 max-h-[65vh] overflow-y-auto">
              <div className="flex items-start gap-2.5 px-6 py-2.5">
                <User size={15} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="eyebrow text-muted">Abogado responsable</p>
                  <p className="text-[13.5px] text-ink">{verDetalle.abogado}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 px-6 py-2.5">
                <Upload size={15} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="eyebrow text-muted">Contrato subido</p>
                  <p className="text-[13.5px] text-ink">{verDetalle.subidoEl}</p>
                  {verDetalle.link && (
                    <a href={verDetalle.link} target="_blank" rel="noreferrer" className="text-navy hover:underline inline-flex items-center gap-1 text-[12.5px] mt-0.5">
                      Ver PDF <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5 px-6 py-2.5">
                <CalendarClock size={15} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="eyebrow text-muted">Plan de pagos</p>
                  {verDetalle.plan ? (
                    <div className="text-[13.5px] text-ink space-y-0.5">
                      <p>{verDetalle.plan.etiqueta} · {pesos(verDetalle.plan.montoTotal)}</p>
                      {verDetalle.plan.montoInicial != null && <p className="text-muted text-[12.5px]">Inicial: {pesos(verDetalle.plan.montoInicial)}</p>}
                      {verDetalle.plan.montoPeriodico != null && <p className="text-muted text-[12.5px]">Cada pago: {pesos(verDetalle.plan.montoPeriodico)}</p>}
                      <p className="text-muted text-[12.5px]">Próximo pago: {verDetalle.plan.fechaProxPago ?? "—"}</p>
                    </div>
                  ) : (
                    <p className="text-amber font-bold text-[13.5px]">Sin registrar</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5 px-6 py-2.5">
                <StickyNote size={15} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="eyebrow text-muted">Notas</p>
                  <p className="text-[13.5px] text-ink">{verDetalle.plan?.notas ?? "—"}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-line">
              <button onClick={() => setVerDetalle(null)} className="px-4 py-2 rounded-lg border border-line text-[13px] hover:border-navy/40 transition-colors">
                Cerrar
              </button>
              <button
                onClick={() => { const c = verDetalle; setVerDetalle(null); abrirPlan(c); }}
                className="px-5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors"
              >
                Editar plan de pagos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
