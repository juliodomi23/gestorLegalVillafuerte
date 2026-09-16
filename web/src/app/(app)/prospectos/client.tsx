"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Phone, Trash2, MapPin, ArrowUpRight, Download, ChevronRight, ChevronDown, Lock } from "lucide-react";
import { PageTitle, Card, FilterSelect } from "@/components/ui";
import { useConfirm } from "@/components/confirm";
import { actualizarProspectoAction, borrarProspectoAction, convertirProspectoAction } from "./actions";
import type { ResumenAbogado, ProspectoRow } from "@/lib/services/prospectos";

export type ProspectoView = ProspectoRow;

export type Abogado = { id: string; nombre: string };

const ESTADOS = [
  { value: "por_contactar", label: "Por contactar" },
  { value: "no_contesto", label: "No contestó" },
  { value: "mensaje_automatico", label: "Mensaje automático" },
  { value: "agendo_cita", label: "Agendó cita" },
  { value: "llamar_despues", label: "Llamar después" },
  { value: "convertido", label: "Convertido" },
  { value: "descartado", label: "Descartado" },
] as const;

const ESTADO_ESTILOS: Record<string, string> = {
  por_contactar: "bg-amber-wash text-amber",
  no_contesto: "bg-paper text-muted",
  mensaje_automatico: "bg-blue-50 text-blue-700",
  agendo_cita: "bg-success-wash text-success",
  llamar_despues: "bg-blue-50 text-blue-700",
  convertido: "bg-emerald-50 text-emerald-700",
  descartado: "bg-danger-wash text-danger",
};

function FilaProspecto({
  p,
  esAdmin,
  abogados,
  hoy,
}: {
  p: ProspectoView;
  esAdmin: boolean;
  abogados: Abogado[];
  hoy: string;
}) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const [estado, setEstado] = useState(p.estado);
  const [nota, setNota] = useState(p.nota);
  const [notaGuardada, setNotaGuardada] = useState(p.nota);
  const [fechaContacto, setFechaContacto] = useState(p.fechaContacto);
  const [abogadoId, setAbogadoId] = useState(p.abogadoId ?? "");
  const [pending, startTransition] = useTransition();
  const confirmar = useConfirm();
  const notaEnfocada = useRef(false);

  // El refresco automático (otra persona registró una llamada, el bot cambió el
  // estado, etc.) trae props nuevos, pero useState solo lee el valor inicial: sin
  // este efecto la fila se quedaría mostrando el dato viejo hasta recargar la página.
  useEffect(() => { setEstado(p.estado); }, [p.estado]);
  useEffect(() => { setFechaContacto(p.fechaContacto); }, [p.fechaContacto]);
  useEffect(() => { setAbogadoId(p.abogadoId ?? ""); }, [p.abogadoId]);
  useEffect(() => {
    // No pisar lo que el abogado está escribiendo ahora mismo.
    if (notaEnfocada.current) return;
    setNota(p.nota);
    setNotaGuardada(p.nota);
  }, [p.nota]);

  function cambiarEstado(nuevoEstado: string) {
    setEstado(nuevoEstado);
    startTransition(() => {
      actualizarProspectoAction(p.id, nuevoEstado, nota, { fechaContacto, abogadoId: abogadoId || null });
    });
  }

  function guardarNota() {
    if (nota === notaGuardada) return;
    setNotaGuardada(nota);
    startTransition(() => {
      actualizarProspectoAction(p.id, estado, nota, { fechaContacto, abogadoId: abogadoId || null });
    });
  }

  function cambiarFechaContacto(nuevaFecha: string) {
    setFechaContacto(nuevaFecha);
    startTransition(() => {
      actualizarProspectoAction(p.id, estado, nota, { fechaContacto: nuevaFecha, abogadoId: abogadoId || null });
    });
  }

  function cambiarAbogado(nuevoAbogadoId: string) {
    setAbogadoId(nuevoAbogadoId);
    // El conteo de "Llamadas por abogado" solo cuenta filas con fecha de llamada puesta.
    // Sin este default, asignarse una llamada no mueve el contador hasta que alguien
    // también llene la fecha a mano — eso es lo que se reportó como "no se actualiza".
    const nuevaFecha = nuevoAbogadoId && !fechaContacto ? new Date().toLocaleDateString("en-CA") : fechaContacto;
    setFechaContacto(nuevaFecha);
    startTransition(() => {
      actualizarProspectoAction(p.id, estado, nota, { fechaContacto: nuevaFecha, abogadoId: nuevoAbogadoId || null });
    });
  }

  async function borrar() {
    if (await confirmar({ titulo: `¿Eliminar a ${p.nombre}?`, peligro: true, confirmLabel: "Eliminar" })) {
      await borrarProspectoAction(p.id);
    }
  }

  const [converting, setConverting] = useState(false);

  async function convertir() {
    setConverting(true);
    const { clienteId } = await convertirProspectoAction(p.id, p.nombre, p.telefono);
    const params = new URLSearchParams({ nuevo: "1", clienteId, nombre: p.nombre });
    router.push(`/expedientes?${params.toString()}`);
  }

  const estiloEstado = ESTADO_ESTILOS[estado] ?? "bg-paper text-muted";
  const esAsesoria = p.origen === "asesoria";
  // Ya la llamaron hoy: se bloquea Abogado/Estado para todos el resto del día, para
  // que nadie reasigne o "se la gane" — mañana, al dejar de ser "hoy", se libera sola.
  const bloqueada = !esAsesoria && !!fechaContacto && fechaContacto === hoy;

  function irAExpediente() {
    const params = new URLSearchParams({ nuevo: "1", nombre: p.nombre });
    if (p.clienteId) params.set("clienteId", p.clienteId);
    router.push(`/expedientes?${params.toString()}`);
  }

  return (
    <>
    <tr className={`hover:bg-paper/60 transition-colors ${pending ? "opacity-60" : ""}`}>
      <td className="px-1 py-3 text-center">
        {p.historial.length > 0 && (
          <button
            onClick={() => setExpandido((v) => !v)}
            title={`${p.historial.length} llamada(s) registrada(s)`}
            className="p-0.5 rounded text-muted hover:text-navy transition-colors"
          >
            {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap num">
        {p.fechaRegistro}
      </td>
      <td className="px-2 py-3 font-bold text-ink">{p.nombre}</td>
      <td className="px-2 py-3 text-[13px] text-muted whitespace-nowrap">
        <a
          href={`tel:${p.telefono}`}
          className="flex items-center gap-1 hover:text-navy transition-colors"
        >
          <Phone size={12} />
          {p.telefono}
        </a>
      </td>
      <td className="px-2 py-3 text-[13px] text-muted">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {p.ciudad}
        </span>
      </td>
      <td className="px-2 py-3 text-[13px]">{p.asunto}</td>
      <td className="px-2 py-3 text-[12px] text-muted whitespace-nowrap num">
        {esAsesoria ? (
          "—"
        ) : (
          <input
            type="date"
            value={fechaContacto}
            onChange={(e) => cambiarFechaContacto(e.target.value)}
            className="bg-transparent border border-transparent hover:border-line focus:border-line focus:outline-none rounded px-1 py-0.5 text-[12px] text-muted"
          />
        )}
      </td>
      <td className="px-2 py-3">
        {esAsesoria ? (
          <span className="text-[12.5px] text-muted">—</span>
        ) : (
          <select
            value={abogadoId}
            onChange={(e) => cambiarAbogado(e.target.value)}
            disabled={bloqueada}
            title={bloqueada ? "Ya se le llamó hoy — se libera mañana" : undefined}
            className="w-36 px-2 py-1 rounded text-[12.5px] bg-transparent border border-transparent hover:border-line focus:border-line focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">—</option>
            {abogados.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-2 py-3">
        {esAsesoria ? (
          <span className={`px-2 py-1 rounded text-[12px] font-bold ${estiloEstado}`}>
            {ESTADOS.find((e) => e.value === estado)?.label ?? estado}
          </span>
        ) : (
        <span className="inline-flex items-center gap-1">
          <select
            value={estado}
            onChange={(e) => cambiarEstado(e.target.value)}
            disabled={bloqueada}
            title={bloqueada ? "Ya se le llamó hoy — se libera mañana" : undefined}
            className={`px-2 py-1 rounded text-[12px] font-bold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-60 ${estiloEstado}`}
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
          {bloqueada && <Lock size={11} className="text-muted" />}
        </span>
        )}
      </td>
      <td className="px-2 py-3 min-w-[160px]">
        {esAsesoria ? (
          <span className="text-[12.5px] text-muted">{nota || "—"}</span>
        ) : (
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onFocus={() => { notaEnfocada.current = true; }}
          onBlur={() => { notaEnfocada.current = false; guardarNota(); }}
          placeholder="Añadir nota…"
          className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-line focus:border-line focus:outline-none text-[12.5px] text-ink placeholder:text-muted/60 transition-colors"
        />
        )}
      </td>
      <td className="px-2 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={esAsesoria ? irAExpediente : convertir}
            disabled={converting}
            title="Crear expediente para este prospecto"
            className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors disabled:opacity-40"
          >
            <ArrowUpRight size={15} />
          </button>
          {esAdmin && !esAsesoria && (
            <button
              onClick={borrar}
              className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
    {expandido && p.historial.length > 0 && (
      <tr className="bg-paper/40">
        <td />
        <td colSpan={10} className="px-4 py-2 text-[12px] text-muted">
          <span className="font-bold">{p.historial.length} llamada(s):</span>{" "}
          {p.historial.map((h, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {h.fecha} ({h.abogadoNombre})
            </span>
          ))}
        </td>
      </tr>
    )}
    </>
  );
}

const MESES = [
  { num: 1, label: "Enero" },
  { num: 2, label: "Febrero" },
  { num: 3, label: "Marzo" },
  { num: 4, label: "Abril" },
  { num: 5, label: "Mayo" },
  { num: 6, label: "Junio" },
  { num: 7, label: "Julio" },
  { num: 8, label: "Agosto" },
  { num: 9, label: "Septiembre" },
  { num: 10, label: "Octubre" },
  { num: 11, label: "Noviembre" },
  { num: 12, label: "Diciembre" },
];

// Mis propias llamadas (hoy/semana/mes): cada abogado ve nada más su fila. La tabla
// de todos los abogados junta vive en /reportes, solo para admins.
function MisLlamadas({ resumen, hoyLabel }: { resumen: ResumenAbogado | null; hoyLabel: string }) {
  if (!resumen) return null;
  const numeros = [
    { label: `Hoy (${hoyLabel})`, valor: resumen.llamadasHoy },
    { label: "Esta semana", valor: resumen.llamadasSemana },
    { label: "Este mes", valor: resumen.llamadasMes },
  ];
  return (
    <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden mb-5">
      <div className="px-5 py-3.5 border-b border-line">
        <h3 className="font-serif text-[17px] text-ink">Mis llamadas</h3>
      </div>
      <div className="grid grid-cols-3 divide-x divide-line">
        {numeros.map((n) => (
          <div key={n.label} className="px-5 py-4 text-center">
            <div className="text-[24px] font-bold text-ink num">{n.valor}</div>
            <div className="text-[12px] text-muted mt-1">{n.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProspectosClient({
  prospectos: prospectosIniciales,
  ciudades,
  abogados,
  esAdmin,
  miResumen: miResumenInicial,
  hoyLabel,
  hoy,
  filtroEstado,
  filtroCiudad,
  filtroMes,
}: {
  prospectos: ProspectoView[];
  ciudades: string[];
  abogados: Abogado[];
  esAdmin: boolean;
  miResumen: ResumenAbogado | null;
  hoyLabel: string;
  hoy: string;
  filtroEstado: string;
  filtroCiudad: string;
  filtroMes: number;
}) {
  const router = useRouter();
  const [prospectos, setProspectos] = useState(prospectosIniciales);
  const [miResumen, setMiResumen] = useState(miResumenInicial);

  // Cambiar de filtro (mes/estado/ciudad) navega de verdad, con datos frescos del server.
  useEffect(() => setProspectos(prospectosIniciales), [prospectosIniciales]);
  useEffect(() => setMiResumen(miResumenInicial), [miResumenInicial]);

  // El bot y otros abogados cambian estados de prospectos en tiempo real (llamadas,
  // citas agendadas); sin esto solo se ve al recargar. Cada 20s, y solo con la
  // pestaña visible para no gastar consultas de más en segundo plano.
  //
  // No usa router.refresh(): esa ruta interna de Next (petición RSC con "_rsc" en la
  // URL) devuelve 503 de forma consistente en este servidor aunque la página normal
  // cargue bien, así que el polling se hizo con fetch normal a /api/prospectos/live
  // (mismo patrón que /api/alertas para la campana del topbar).
  useEffect(() => {
    let vivo = true;
    const refrescar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const params = new URLSearchParams({ mes: String(filtroMes) });
        if (filtroCiudad) params.set("ciudad", filtroCiudad);
        if (filtroEstado) params.set("estado", filtroEstado);
        const res = await fetch(`/api/prospectos/live?${params}`);
        if (!res.ok || !vivo) return;
        const d = await res.json();
        if (!vivo) return;
        setProspectos(d.prospectos ?? []);
        setMiResumen(d.miResumen ?? null);
      } catch {
        // sin conexión: se reintenta en el siguiente ciclo
      }
    };
    const id = setInterval(refrescar, 20_000);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [filtroCiudad, filtroEstado, filtroMes]);

  function setFiltro(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "estado" && filtroEstado) params.set("estado", filtroEstado);
    if (key !== "ciudad" && filtroCiudad) params.set("ciudad", filtroCiudad);
    params.set("mes", key !== "mes" ? String(filtroMes) : value);
    if (value && key !== "mes") params.set(key, value);
    router.push(`/prospectos?${params.toString()}`);
  }

  const contadores = ESTADOS.reduce<Record<string, number>>((acc, e) => {
    acc[e.value] = prospectos.filter((p) => p.estado === e.value).length;
    return acc;
  }, {});

  const mesLabel = MESES.find((m) => m.num === filtroMes)?.label ?? "—";

  function exportarCSV() {
    const encabezado = ["Fecha de registro", "Nombre", "Teléfono", "Ciudad", "Asunto", "Fecha de llamada", "Abogado", "Estado", "Nota"];
    const filas = prospectos.map((p) => [
      p.fechaRegistro,
      p.nombre,
      p.telefono,
      p.ciudad,
      p.asunto,
      p.origen === "llamada" ? p.fechaContacto : "",
      abogados.find((a) => a.id === p.abogadoId)?.nombre ?? "",
      ESTADOS.find((e) => e.value === p.estado)?.label ?? p.estado,
      p.nota,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospectos-${mesLabel.toLowerCase()}-2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageTitle
        eyebrow="Clientes"
        title="Prospectos"
        subtitle={`${prospectos.length} en ${mesLabel} 2026`}
      />

      <MisLlamadas resumen={miResumen} hoyLabel={hoyLabel} />

      {/* Selector de mes */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {MESES.map((m) => (
          <button
            key={m.num}
            onClick={() => setFiltro("mes", String(m.num))}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${
              filtroMes === m.num
                ? "bg-navy text-white border-navy"
                : "border-line text-muted hover:bg-paper"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chips de estado rápido */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFiltro("estado", "")}
          className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${
            !filtroEstado
              ? "bg-navy text-white border-navy"
              : "border-line text-muted hover:bg-paper"
          }`}
        >
          Todos ({prospectos.length})
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e.value}
            onClick={() => setFiltro("estado", e.value === filtroEstado ? "" : e.value)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border ${
              filtroEstado === e.value
                ? "bg-navy text-white border-navy"
                : "border-line text-muted hover:bg-paper"
            }`}
          >
            {e.label} ({contadores[e.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Filtro ciudad + exportar */}
      <div className="flex items-center gap-2 mb-4">
        <FilterSelect
          label="Ciudad"
          value={filtroCiudad}
          onChange={(v) => setFiltro("ciudad", v)}
          options={ciudades}
        />
        <span className="flex-1" />
        <button
          onClick={exportarCSV}
          disabled={prospectos.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-surface text-[13px] text-muted hover:border-navy/40 hover:text-navy transition-colors disabled:opacity-40"
        >
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-1 py-3"></th>
              <th className="eyebrow text-muted px-4 py-3">Fecha de registro</th>
              <th className="eyebrow text-muted px-2 py-3">Nombre</th>
              <th className="eyebrow text-muted px-2 py-3">Teléfono</th>
              <th className="eyebrow text-muted px-2 py-3">Ciudad</th>
              <th className="eyebrow text-muted px-2 py-3">Asunto</th>
              <th className="eyebrow text-muted px-2 py-3">Fecha de llamada</th>
              <th className="eyebrow text-muted px-2 py-3">Abogado</th>
              <th className="eyebrow text-muted px-2 py-3">Estado</th>
              <th className="eyebrow text-muted px-2 py-3">Nota</th>
              <th className="eyebrow text-muted px-2 py-3 text-right">–</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {prospectos.map((p) => (
              <FilaProspecto key={p.id} p={p} esAdmin={esAdmin} abogados={abogados} hoy={hoy} />
            ))}
            {prospectos.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-muted"
                >
                  No hay prospectos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
