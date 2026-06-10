"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Trash2, MapPin } from "lucide-react";
import { PageTitle, Card, FilterSelect } from "@/components/ui";
import { actualizarProspectoAction, borrarProspectoAction } from "./actions";

export type ProspectoView = {
  id: string;
  nombre: string;
  telefono: string;
  ciudad: string;
  asunto: string;
  estado: string;
  nota: string;
  fechaLlamada: string;
};

const ESTADOS = [
  { value: "por_contactar", label: "Por contactar" },
  { value: "no_contesto", label: "No contestó" },
  { value: "agendo_cita", label: "Agendó cita" },
  { value: "llamar_despues", label: "Llamar después" },
  { value: "convertido", label: "Convertido" },
  { value: "descartado", label: "Descartado" },
] as const;

const ESTADO_ESTILOS: Record<string, string> = {
  por_contactar: "bg-amber-wash text-amber",
  no_contesto: "bg-paper text-muted",
  agendo_cita: "bg-success-wash text-success",
  llamar_despues: "bg-blue-50 text-blue-700",
  convertido: "bg-emerald-50 text-emerald-700",
  descartado: "bg-danger-wash text-danger",
};

function FilaProspecto({
  p,
  esAdmin,
}: {
  p: ProspectoView;
  esAdmin: boolean;
}) {
  const [estado, setEstado] = useState(p.estado);
  const [nota, setNota] = useState(p.nota);
  const [notaGuardada, setNotaGuardada] = useState(p.nota);
  const [pending, startTransition] = useTransition();

  function cambiarEstado(nuevoEstado: string) {
    setEstado(nuevoEstado);
    startTransition(() => {
      actualizarProspectoAction(p.id, nuevoEstado, nota);
    });
  }

  function guardarNota() {
    if (nota === notaGuardada) return;
    setNotaGuardada(nota);
    startTransition(() => {
      actualizarProspectoAction(p.id, estado, nota);
    });
  }

  async function borrar() {
    if (confirm(`¿Eliminar a ${p.nombre}?`)) {
      await borrarProspectoAction(p.id);
    }
  }

  const estiloEstado = ESTADO_ESTILOS[estado] ?? "bg-paper text-muted";

  return (
    <tr className={`hover:bg-paper/60 transition-colors ${pending ? "opacity-60" : ""}`}>
      <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap num">
        {p.fechaLlamada}
      </td>
      <td className="px-3 py-3 font-bold text-ink">{p.nombre}</td>
      <td className="px-3 py-3 text-[13px] text-muted whitespace-nowrap">
        <a
          href={`tel:${p.telefono}`}
          className="flex items-center gap-1 hover:text-navy transition-colors"
        >
          <Phone size={12} />
          {p.telefono}
        </a>
      </td>
      <td className="px-3 py-3 text-[13px] text-muted">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {p.ciudad}
        </span>
      </td>
      <td className="px-3 py-3 text-[13px]">{p.asunto}</td>
      <td className="px-3 py-3">
        <select
          value={estado}
          onChange={(e) => cambiarEstado(e.target.value)}
          className={`px-2 py-1 rounded text-[12px] font-bold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/20 ${estiloEstado}`}
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3 min-w-[180px]">
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={guardarNota}
          placeholder="Añadir nota…"
          className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-line focus:border-line focus:outline-none text-[12.5px] text-ink placeholder:text-muted/60 transition-colors"
        />
      </td>
      {esAdmin && (
        <td className="px-3 py-3 text-right">
          <button
            onClick={borrar}
            className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </td>
      )}
    </tr>
  );
}

export default function ProspectosClient({
  prospectos,
  ciudades,
  esAdmin,
  filtroEstado,
  filtroCiudad,
}: {
  prospectos: ProspectoView[];
  ciudades: string[];
  esAdmin: boolean;
  filtroEstado: string;
  filtroCiudad: string;
}) {
  const router = useRouter();

  function setFiltro(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "estado" && filtroEstado) params.set("estado", filtroEstado);
    if (key !== "ciudad" && filtroCiudad) params.set("ciudad", filtroCiudad);
    if (value) params.set(key, value);
    router.push(`/prospectos?${params.toString()}`);
  }

  const contadores = ESTADOS.reduce<Record<string, number>>((acc, e) => {
    acc[e.value] = prospectos.filter((p) => p.estado === e.value).length;
    return acc;
  }, {});

  return (
    <>
      <PageTitle
        eyebrow="Clientes"
        title="Prospectos"
        subtitle={`${prospectos.length} en pantalla`}
      />

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

      {/* Filtro ciudad */}
      <div className="flex items-center gap-2 mb-4">
        <FilterSelect
          label="Ciudad"
          value={filtroCiudad}
          onChange={(v) => setFiltro("ciudad", v)}
          options={ciudades}
        />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-4 py-3">Fecha</th>
              <th className="eyebrow text-muted px-3 py-3">Nombre</th>
              <th className="eyebrow text-muted px-3 py-3">Teléfono</th>
              <th className="eyebrow text-muted px-3 py-3">Ciudad</th>
              <th className="eyebrow text-muted px-3 py-3">Asunto</th>
              <th className="eyebrow text-muted px-3 py-3">Estado</th>
              <th className="eyebrow text-muted px-3 py-3">Nota</th>
              {esAdmin && <th className="eyebrow text-muted px-3 py-3 text-right">–</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {prospectos.map((p) => (
              <FilaProspecto key={p.id} p={p} esAdmin={esAdmin} />
            ))}
            {prospectos.length === 0 && (
              <tr>
                <td
                  colSpan={esAdmin ? 8 : 7}
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
