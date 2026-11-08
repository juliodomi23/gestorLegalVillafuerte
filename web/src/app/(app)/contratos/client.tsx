"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Upload,
  Loader,
  Pencil,
  CalendarClock,
  ExternalLink,
  Eye,
  X,
  User,
  StickyNote,
  Plus,
  ClipboardCheck,
  ChevronRight,
  ChevronDown,
  Banknote,
  Download,
} from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { guardarPlanAction, guardarRevisionAction, guardarProrrogaAction, registrarPagoAction } from "./actions";
import { crearExpedienteAction, crearClienteRapidoAction } from "@/app/(app)/expedientes/actions";
import { ETIQUETA_PLAN, ETIQUETA_REVISION, type ContratoView, type EstadoRevision } from "@/lib/services/contratos";
import { MATERIAS, ETAPAS } from "@/lib/constants";

const TIPOS = ["todo_inicio", "inicio_final", "semanal", "quincenal", "mensual"];
const ETIQUETAS = TIPOS.map((t) => ETIQUETA_PLAN[t]);

const ESTADOS_REVISION: EstadoRevision[] = ["pendiente", "aprobado", "corregir"];
const ESTILO_REVISION: Record<EstadoRevision, string> = {
  pendiente: "bg-line/40 text-muted",
  aprobado: "bg-success-wash text-success",
  corregir: "bg-danger-wash text-danger",
};

const ESTADOS_COBRO = ["Vencido", "Con saldo", "Liquidado", "Sin plan"];
const estadoCobro = (c: ContratoView) =>
  !c.plan ? "Sin plan" : c.vencido ? "Vencido" : c.plan.saldo > 0 ? "Con saldo" : "Liquidado";

// PlanPago es único por expediente: dos contratos del mismo expediente comparten plan
// y pagos, así que para sumar hay que contar cada expediente una sola vez.
const unicosPorExpediente = (lista: ContratoView[]) => [...new Map(lista.map((c) => [c.expedienteId, c])).values()];

function resumirPor(lista: ContratoView[], clave: (c: ContratoView) => string) {
  const grupos = new Map<string, { contratos: number; contratado: number; cobrado: number; vencidos: number }>();
  for (const c of unicosPorExpediente(lista)) {
    const g = grupos.get(clave(c)) ?? { contratos: 0, contratado: 0, cobrado: 0, vencidos: 0 };
    g.contratos += 1;
    g.contratado += c.plan?.montoTotal ?? 0;
    g.cobrado += c.plan?.pagado ?? 0;
    g.vencidos += c.vencido ? 1 : 0;
    grupos.set(clave(c), g);
  }
  return [...grupos.entries()].sort((a, b) => b[1].contratado - a[1].contratado);
}

function descargarCsv(lista: ContratoView[]) {
  const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const filas = [
    ["Expediente", "Cliente", "Abogado", "Sucursal", "Firma", "Subido", "Plan", "Total", "Cobrado", "Saldo", "Próximo pago", "Prórroga hasta", "Cobro", "Revisión"],
    ...lista.map((c) => [
      c.numeroExpediente, c.cliente, c.abogado, c.sucursal, c.fechaFirma ?? "", c.subidoEl,
      c.plan?.etiqueta ?? "", c.plan?.montoTotal ?? "", c.plan?.pagado ?? "", c.plan?.saldo ?? "",
      c.plan?.fechaProxPago ?? "", c.prorrogaHasta ?? "", estadoCobro(c), ETIQUETA_REVISION[c.revisionEstado],
    ]),
  ];
  const csv = "\uFEFF" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `contratos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const etiquetaMes = (m: string) => `${MESES_ES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const filtrosVacios = { mes: "", abogado: "", sucursal: "", revision: "", cobro: "" };

const expedienteVacio = { clienteNombre: "", clienteTel: "", materia: "", etapa: "", abogado: "", sucursal: "" };

const pesos = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const pagoVacio = { expedienteId: "", monto: "", fecha: "", concepto: "" };

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

  const [abiertoPago, setAbiertoPago] = useState(false);
  const [formPago, setFormPago] = useState(pagoVacio);
  const [errorPago, setErrorPago] = useState("");
  const [registrando, setRegistrando] = useState(false);

  const [filtros, setFiltros] = useState(filtrosVacios);
  const setFiltro = (c: keyof typeof filtrosVacios, v: string) => setFiltros((f) => ({ ...f, [c]: v }));

  const meses = [...new Set(contratos.map((c) => c.mes))].sort().reverse();
  const etiquetaRevision = (c: ContratoView) => ETIQUETA_REVISION[c.revisionEstado];
  const visibles = contratos.filter(
    (c) =>
      (!filtros.mes || etiquetaMes(c.mes) === filtros.mes) &&
      (!filtros.abogado || c.abogado === filtros.abogado) &&
      (!filtros.sucursal || c.sucursal === filtros.sucursal) &&
      (!filtros.revision || etiquetaRevision(c) === filtros.revision) &&
      (!filtros.cobro || estadoCobro(c) === filtros.cobro)
  );
  const unicos = unicosPorExpediente(visibles);
  const totalVisible = unicos.reduce((s, c) => s + (c.plan?.montoTotal ?? 0), 0);
  const cobradoVisible = unicos.reduce((s, c) => s + (c.plan?.pagado ?? 0), 0);
  const vencidosVisibles = unicos.filter((c) => c.vencido).length;

  function abrirPago(c: ContratoView) {
    setErrorPago("");
    setFormPago({
      expedienteId: c.expedienteId,
      monto: c.plan?.montoPeriodico ? String(c.plan.montoPeriodico) : "",
      fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }),
      concepto: "",
    });
    setAbiertoPago(true);
  }

  async function guardarPago() {
    setErrorPago("");
    setRegistrando(true);
    const r = await registrarPagoAction(formPago);
    setRegistrando(false);
    if (!r.ok) {
      setErrorPago(r.error);
      return;
    }
    setAbiertoPago(false);
    setAviso("Pago registrado en Caja.");
    router.refresh();
  }

  const setExp = (c: keyof typeof expedienteVacio, v: string) => setFormExp((f) => ({ ...f, [c]: v }));

  const set = (c: keyof typeof planVacio, v: string) => setForm((f) => ({ ...f, [c]: v }));

  const esParcialidades =
    form.tipo === ETIQUETA_PLAN.semanal || form.tipo === ETIQUETA_PLAN.quincenal || form.tipo === ETIQUETA_PLAN.mensual;
  const resumenPagos = (() => {
    const total = Number(form.montoTotal);
    const inicial = Number(form.montoInicial) || 0;
    const periodico = Number(form.montoPeriodico);
    if (!esParcialidades || !total || !periodico) return "";
    const restante = total - inicial;
    if (restante <= 0) return "";
    const cantidad = Math.ceil(restante / periodico);
    const frecuencia =
      form.tipo === ETIQUETA_PLAN.semanal ? "semanal" : form.tipo === ETIQUETA_PLAN.quincenal ? "quincenal" : "mensual";
    return `Serán ${cantidad} pago${cantidad === 1 ? "" : "s"} ${frecuencia}${cantidad === 1 ? "" : "es"} de ${pesos(periodico)}${
      restante % periodico !== 0 ? " (el último ajusta el resto)" : ""
    }.`;
  })();

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

      {esAdmin && contratos.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {[
            { titulo: "Por abogado", filas: resumirPor(visibles, (c) => c.abogado) },
            { titulo: "Por sucursal", filas: resumirPor(visibles, (c) => c.sucursal) },
          ].map(({ titulo, filas }) => (
            <Card key={titulo} className="overflow-x-auto">
              <div className="px-5 py-3 border-b border-line">
                <h3 className="font-serif text-[16px]">{titulo}</h3>
                <p className="text-[12px] text-muted">Respeta los filtros de abajo.</p>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="eyebrow text-muted px-5 py-2">{titulo.slice(4)}</th>
                    <th className="eyebrow text-muted px-2 py-2 text-right">Contr.</th>
                    <th className="eyebrow text-muted px-2 py-2 text-right">Contratado</th>
                    <th className="eyebrow text-muted px-2 py-2 text-right">Cobrado</th>
                    <th className="eyebrow text-muted px-2 py-2 text-right">Saldo</th>
                    <th className="eyebrow text-muted px-3 py-2 text-right">Venc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filas.map(([nombre, g]) => (
                    <tr key={nombre}>
                      <td className="px-5 py-2">{nombre}</td>
                      <td className="px-2 py-2 num text-right">{g.contratos}</td>
                      <td className="px-2 py-2 num text-right">{pesos(g.contratado)}</td>
                      <td className="px-2 py-2 num text-right">{pesos(g.cobrado)}</td>
                      <td className="px-2 py-2 num text-right">{pesos(g.contratado - g.cobrado)}</td>
                      <td className={`px-3 py-2 num text-right ${g.vencidos ? "text-danger font-bold" : "text-muted"}`}>{g.vencidos}</td>
                    </tr>
                  ))}
                  {filas.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-4 text-center text-muted">Sin datos.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto">
        {esAdmin && (
          <div className="px-5 py-3.5 border-b border-line flex gap-3 flex-wrap items-end">
            <div className="min-w-[140px]">
              <span className="eyebrow text-muted block mb-1.5">Mes</span>
              <Select options={meses.map(etiquetaMes)} value={filtros.mes} onChange={(e) => setFiltro("mes", e.target.value)} />
            </div>
            <div className="min-w-[160px]">
              <span className="eyebrow text-muted block mb-1.5">Abogado</span>
              <Select options={abogados} value={filtros.abogado} onChange={(e) => setFiltro("abogado", e.target.value)} />
            </div>
            <div className="min-w-[140px]">
              <span className="eyebrow text-muted block mb-1.5">Sucursal</span>
              <Select options={sucursales} value={filtros.sucursal} onChange={(e) => setFiltro("sucursal", e.target.value)} />
            </div>
            <div className="min-w-[140px]">
              <span className="eyebrow text-muted block mb-1.5">Revisión</span>
              <Select options={ESTADOS_REVISION.map((s) => ETIQUETA_REVISION[s])} value={filtros.revision} onChange={(e) => setFiltro("revision", e.target.value)} />
            </div>
            <div className="min-w-[140px]">
              <span className="eyebrow text-muted block mb-1.5">Cobro</span>
              <Select options={ESTADOS_COBRO} value={filtros.cobro} onChange={(e) => setFiltro("cobro", e.target.value)} />
            </div>
            <button
              onClick={() => setFiltros(filtrosVacios)}
              className="px-3 py-2.5 rounded-lg border border-line text-[13px] hover:border-navy/40 transition-colors"
            >
              Limpiar
            </button>
            <p className="text-[12.5px] text-muted ml-auto">
              {visibles.length} de {contratos.length} · contratado {pesos(totalVisible)} · cobrado {pesos(cobradoVisible)}
              {vencidosVisibles > 0 && <span className="text-danger font-bold"> · {vencidosVisibles} vencido{vencidosVisibles === 1 ? "" : "s"}</span>}
            </p>
            <button
              onClick={() => descargarCsv(visibles)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-line text-[13px] font-bold text-navy hover:border-navy/40 transition-colors"
            >
              <Download size={15} /> Excel
            </button>
          </div>
        )}
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
              {esAdmin && <th className="px-1 py-3" />}
              <th className="eyebrow text-muted px-5 py-3">Expediente</th>
              <th className="eyebrow text-muted px-3 py-3">Cliente</th>
              <th className="eyebrow text-muted px-3 py-3">Contrato</th>
              <th className="eyebrow text-muted px-3 py-3">Plan</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Total</th>
              <th className="eyebrow text-muted px-3 py-3">Próximo pago</th>
              {esAdmin && <th className="eyebrow text-muted px-3 py-3">Prórroga hasta</th>}
              <th className="eyebrow text-muted px-3 py-3">Abogado</th>
              {esAdmin && <th className="eyebrow text-muted px-3 py-3">Revisión</th>}
              <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {visibles.map((c) => (
              <FilaContrato
                key={c.documentoId}
                c={c}
                esAdmin={esAdmin}
                onVerDetalle={() => setVerDetalle(c)}
                onAbrirPlan={() => abrirPlan(c)}
                onRegistrarPago={() => abrirPago(c)}
              />
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={esAdmin ? 11 : 8} className="px-5 py-10 text-center text-muted">
                  {contratos.length === 0 ? "Todavía no hay contratos subidos." : "Ningún contrato coincide con los filtros."}
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
        <Field label="Tipo de plan">
          <Select options={ETIQUETAS} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} />
        </Field>
        <Field label="Monto total">
          <Input value={form.montoTotal} onChange={(e) => set("montoTotal", e.target.value)} placeholder="15000" />
        </Field>
        {form.tipo && form.tipo !== ETIQUETA_PLAN.todo_inicio && (
          <Field label="Pago inicial (opcional)">
            <Input value={form.montoInicial} onChange={(e) => set("montoInicial", e.target.value)} placeholder="5000" />
          </Field>
        )}
        {esParcialidades && (
          <>
            <Field label="Monto de cada pago">
              <Input
                value={form.montoPeriodico}
                onChange={(e) => set("montoPeriodico", e.target.value)}
                placeholder="2500"
              />
            </Field>
            <Field label="Fecha del próximo pago">
              <Input type="date" value={form.fechaProxPago} onChange={(e) => set("fechaProxPago", e.target.value)} />
            </Field>
            {resumenPagos && (
              <p className="col-span-full text-[12.5px] text-navy bg-navy/[.06] rounded-lg px-3 py-2 -mt-1">
                {resumenPagos}
              </p>
            )}
            <p className="col-span-full text-[12px] text-muted -mt-1">
              El próximo pago se agenda solo en el calendario del despacho.
            </p>
          </>
        )}
        {form.tipo === ETIQUETA_PLAN.inicio_final && (
          <Field label="Fecha del pago final">
            <Input type="date" value={form.fechaProxPago} onChange={(e) => set("fechaProxPago", e.target.value)} />
          </Field>
        )}
        <Field label="Notas" full>
          <Input value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Acordado con el cliente…" />
        </Field>
        {error && (
          <p className="col-span-full text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2">{error}</p>
        )}
      </Modal>

      <Modal
        open={abiertoPago}
        onClose={() => setAbiertoPago(false)}
        title="Registrar pago"
        onSubmit={guardarPago}
        submitLabel={registrando ? "Guardando…" : "Registrar pago"}
      >
        <Field label="Monto"><Input value={formPago.monto} onChange={(e) => setFormPago((f) => ({ ...f, monto: e.target.value }))} placeholder="2500" autoFocus /></Field>
        <Field label="Fecha del pago"><Input type="date" value={formPago.fecha} onChange={(e) => setFormPago((f) => ({ ...f, fecha: e.target.value }))} /></Field>
        <Field label="Concepto (opcional)" full><Input value={formPago.concepto} onChange={(e) => setFormPago((f) => ({ ...f, concepto: e.target.value }))} placeholder="Pago de contrato" /></Field>
        <p className="col-span-full text-[12px] text-muted -mt-1">
          Se guarda como ingreso en Caja. Si el plan es por parcialidades, la fecha del próximo pago avanza sola.
        </p>
        {errorPago && (
          <p className="col-span-full text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2">{errorPago}</p>
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
                  {verDetalle.fechaFirma && <p className="text-muted text-[12.5px]">Firmado: {verDetalle.fechaFirma}</p>}
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
              {verDetalle.plan && verDetalle.plan.tipo !== "todo_inicio" && (
                <div className="flex items-start gap-2.5 px-6 py-2.5">
                  <FileText size={15} className="text-muted shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="eyebrow text-muted">Pagos registrados</p>
                    <p className="text-[13.5px] text-ink">
                      {pesos(verDetalle.plan.pagado)} de {pesos(verDetalle.plan.montoTotal)}
                      {verDetalle.plan.saldo > 0 && (
                        <span className="text-amber font-bold"> · faltan {pesos(verDetalle.plan.saldo)}</span>
                      )}
                    </p>
                    {verDetalle.plan.pagos.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {verDetalle.plan.pagos.map((p, i) => (
                          <li key={i} className="text-muted text-[12.5px] flex justify-between gap-3">
                            <span>{p.fecha}{p.concepto ? ` · ${p.concepto}` : ""}</span>
                            <span className="num">{pesos(p.monto)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted text-[12.5px] mt-0.5">Sin pagos registrados en Caja todavía.</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5 px-6 py-2.5">
                <StickyNote size={15} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="eyebrow text-muted">Notas</p>
                  <p className="text-[13.5px] text-ink">{verDetalle.plan?.notas ?? "—"}</p>
                </div>
              </div>
              {esAdmin && (
                <div className="flex items-start gap-2.5 px-6 py-2.5">
                  <ClipboardCheck size={15} className="text-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="eyebrow text-muted">Revisión</p>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11.5px] font-bold ${ESTILO_REVISION[verDetalle.revisionEstado]}`}>
                      {ETIQUETA_REVISION[verDetalle.revisionEstado]}
                    </span>
                    {verDetalle.revisionNotas && (
                      <p className="text-[13px] text-ink mt-1">{verDetalle.revisionNotas}</p>
                    )}
                  </div>
                </div>
              )}
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

// Checklist de revisión, inline como en Prospectos: select con el estado + flecha
// que despliega una fila corta para la nota. Solo se monta cuando esAdmin (el
// select y el guardado son admin-only; ver actions.ts).
function FilaContrato({
  c,
  esAdmin,
  onVerDetalle,
  onAbrirPlan,
  onRegistrarPago,
}: {
  c: ContratoView;
  esAdmin: boolean;
  onVerDetalle: () => void;
  onAbrirPlan: () => void;
  onRegistrarPago: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [estado, setEstado] = useState(c.revisionEstado);
  const [prorroga, setProrroga] = useState(c.prorrogaHasta ?? "");
  const [notas, setNotas] = useState(c.revisionNotas ?? "");
  const [notasGuardadas, setNotasGuardadas] = useState(c.revisionNotas ?? "");
  const notaEnfocada = useRef(false);

  useEffect(() => { setEstado(c.revisionEstado); }, [c.revisionEstado]);
  useEffect(() => { setProrroga(c.prorrogaHasta ?? ""); }, [c.prorrogaHasta]);
  useEffect(() => {
    if (notaEnfocada.current) return;
    setNotas(c.revisionNotas ?? "");
    setNotasGuardadas(c.revisionNotas ?? "");
  }, [c.revisionNotas]);

  function cambiarEstado(nuevo: EstadoRevision) {
    setEstado(nuevo);
    guardarRevisionAction(c.documentoId, nuevo, notas);
  }

  function guardarNotas() {
    if (notas === notasGuardadas) return;
    setNotasGuardadas(notas);
    guardarRevisionAction(c.documentoId, estado, notas);
  }

  return (
    <>
      <tr className="hover:bg-paper/60 transition-colors">
        {esAdmin && (
          <td className="px-1 py-3 text-center">
            <button
              onClick={() => setExpandido((v) => !v)}
              title="Nota de revisión"
              className="p-0.5 rounded text-muted hover:text-navy transition-colors"
            >
              {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </td>
        )}
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
          {c.plan ? c.plan.etiqueta : <span className="text-amber font-bold">Sin registrar</span>}
        </td>
        <td className="px-3 py-3 num text-right">{c.plan ? pesos(c.plan.montoTotal) : "—"}</td>
        <td className={`px-3 py-3 num ${c.vencido ? "text-danger font-bold" : "text-muted"}`}>
          {c.plan?.fechaProxPago ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={13} /> {c.plan.fechaProxPago}{c.vencido && " · vencido"}
            </span>
          ) : (
            "—"
          )}
        </td>
        {esAdmin && (
          <td className="px-3 py-3">
            <input
              type="date"
              value={prorroga}
              onChange={(e) => { setProrroga(e.target.value); guardarProrrogaAction(c.documentoId, e.target.value); }}
              title="Hasta cuándo se le dio prórroga de pago"
              className="px-2 py-1 rounded border border-line text-[12px] bg-transparent"
            />
          </td>
        )}
        <td className="px-3 py-3 text-muted">{c.abogado}</td>
        {esAdmin && (
          <td className="px-3 py-3">
            <select
              value={estado}
              onChange={(e) => cambiarEstado(e.target.value as EstadoRevision)}
              className={`px-2 py-1 rounded text-[11.5px] font-bold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/20 ${ESTILO_REVISION[estado]}`}
            >
              {ESTADOS_REVISION.map((s) => (
                <option key={s} value={s}>
                  {ETIQUETA_REVISION[s]}
                </option>
              ))}
            </select>
          </td>
        )}
        <td className="px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onVerDetalle}
              title="Ver detalles"
              aria-label="Ver detalles"
              className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
            >
              <Eye size={16} />
            </button>
            {c.plan && (
              <button
                onClick={onRegistrarPago}
                title="Registrar pago"
                aria-label="Registrar pago"
                className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
              >
                <Banknote size={16} />
              </button>
            )}
            <button
              onClick={onAbrirPlan}
              title="Plan de pagos"
              aria-label="Plan de pagos"
              className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
            >
              <Pencil size={16} />
            </button>
          </div>
        </td>
      </tr>
      {esAdmin && expandido && (
        <tr className="bg-paper/40">
          <td />
          <td colSpan={10} className="px-4 py-2">
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onFocus={() => { notaEnfocada.current = true; }}
              onBlur={() => { notaEnfocada.current = false; guardarNotas(); }}
              placeholder="Nota de revisión (qué falta corregir)…"
              className="w-full max-w-lg px-2 py-1 rounded bg-surface border border-line focus:border-navy/40 focus:outline-none text-[12.5px] text-ink placeholder:text-muted/60 transition-colors"
            />
          </td>
        </tr>
      )}
    </>
  );
}
