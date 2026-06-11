"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Phone, Trash2, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { Modal, Field, Input, Select } from "@/components/modal";
import { crearCitaAction, borrarCitaAction } from "./actions";

export type CitaView = {
  id: string;
  fechaISO: string;
  hora: string;
  cliente: string;
  asunto: string;
  telefono: string;
  sucursal: string;
  abogado: string;
  estado: string;
};

const VISTAS = ["dia", "semana", "mes"] as const;
type Vista = (typeof VISTAS)[number];

const vacio = { cliente: "", asunto: "", telefono: "", hora: "", sucursal: "", abogado: "" };

function navegarFecha(fechaStr: string, vista: Vista, dir: 1 | -1): string {
  const [y, m, d] = fechaStr.split("-").map(Number);
  if (vista === "dia") return new Date(y, m - 1, d + dir).toLocaleDateString("en-CA");
  if (vista === "semana") return new Date(y, m - 1, d + dir * 7).toLocaleDateString("en-CA");
  return new Date(y, m - 1 + dir, 1).toLocaleDateString("en-CA");
}

function encabezadoVista(fechaStr: string, vista: Vista): string {
  const [y, m, d] = fechaStr.split("-").map(Number);
  if (vista === "dia") {
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }
  if (vista === "semana") {
    const base = new Date(y, m - 1, d);
    const diaSemana = base.getDay();
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(y, m - 1, d + diffLunes);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    const fmtL = lunes.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const fmtD = domingo.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
    return `${fmtL} – ${fmtD}`;
  }
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function formatearDia(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function TablaSimple({ citas, onBorrar }: { citas: CitaView[]; onBorrar: (id: string) => void }) {
  return (
    <table className="w-full min-w-[820px] text-[13.5px]">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="eyebrow text-muted px-5 py-3">Hora</th>
          <th className="eyebrow text-muted px-3 py-3">Cliente</th>
          <th className="eyebrow text-muted px-3 py-3">Asunto</th>
          <th className="eyebrow text-muted px-3 py-3">Teléfono</th>
          <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
          <th className="eyebrow text-muted px-3 py-3">Abogado</th>
          <th className="eyebrow text-muted px-3 py-3">Estado</th>
          <th className="eyebrow text-muted px-3 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/70">
        {citas.map((c) => (
          <tr key={c.id} className="hover:bg-paper/60 transition-colors">
            <td className="px-5 py-3.5 num font-bold text-navy">{c.hora}</td>
            <td className="px-3 py-3.5 font-bold">{c.cliente}</td>
            <td className="px-3 py-3.5">{c.asunto}</td>
            <td className="px-3 py-3.5 num text-muted whitespace-nowrap">
              <Phone size={13} className="inline mr-1" />
              {c.telefono}
            </td>
            <td className="px-3 py-3.5 text-muted">{c.sucursal}</td>
            <td className="px-3 py-3.5">{c.abogado}</td>
            <td className="px-3 py-3.5">
              <span
                className={`px-2 py-0.5 rounded text-[12px] font-bold ${
                  c.estado === "Confirmada"
                    ? "bg-success-wash text-success"
                    : "bg-amber-wash text-amber"
                }`}
              >
                {c.estado}
              </span>
            </td>
            <td className="px-3 py-3.5 text-right">
              <button
                onClick={() => onBorrar(c.id)}
                className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-wash transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
        {citas.length === 0 && (
          <tr>
            <td colSpan={8} className="px-5 py-10 text-center text-muted">
              No hay citas en este período.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function AgendaClient({
  citas,
  sucursales,
  abogados,
  fechaActual,
  vista,
}: {
  citas: CitaView[];
  sucursales: string[];
  abogados: string[];
  fechaActual: string;
  vista: string;
}) {
  const router = useRouter();
  const vistaActual: Vista = VISTAS.includes(vista as Vista) ? (vista as Vista) : "dia";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  function set(campo: keyof typeof vacio, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function navegar(dir: 1 | -1) {
    const nuevaFecha = navegarFecha(fechaActual, vistaActual, dir);
    router.push(`/agenda?fecha=${nuevaFecha}&vista=${vistaActual}`);
  }

  function cambiarVista(v: Vista) {
    router.push(`/agenda?fecha=${fechaActual}&vista=${v}`);
  }

  async function borrar(id: string) {
    if (confirm("¿Cancelar esta cita?")) await borrarCitaAction(id);
  }

  async function guardar() {
    setSaving(true);
    await crearCitaAction({
      cliente: form.cliente,
      asunto: form.asunto,
      hora: form.hora,
      telefono: form.telefono,
      sucursal: form.sucursal,
      abogado: form.abogado,
    });
    setSaving(false);
    setForm(vacio);
    setOpen(false);
  }

  const citasPorDia = citas.reduce<Record<string, CitaView[]>>((acc, c) => {
    if (!acc[c.fechaISO]) acc[c.fechaISO] = [];
    acc[c.fechaISO].push(c);
    return acc;
  }, {});
  const diasOrdenados = Object.keys(citasPorDia).sort();

  const etiquetaVista = { dia: "Día", semana: "Semana", mes: "Mes" };

  return (
    <>
      <PageTitle
        eyebrow="Despacho"
        title="Agenda"
        subtitle={`${citas.length} cita${citas.length !== 1 ? "s" : ""}`}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Tabs vista */}
        <div className="flex rounded-lg border border-line overflow-hidden text-[13px]">
          {VISTAS.map((v) => (
            <button
              key={v}
              onClick={() => cambiarVista(v)}
              className={`px-4 py-2 font-medium transition-colors ${
                vistaActual === v
                  ? "bg-navy text-white"
                  : "hover:bg-paper text-muted"
              }`}
            >
              {etiquetaVista[v]}
            </button>
          ))}
        </div>

        {/* Navegación fecha */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navegar(-1)}
            className="p-1.5 rounded-md hover:bg-paper transition-colors text-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[13px] sm:text-[13.5px] font-medium text-ink min-w-[160px] sm:min-w-[240px] text-center capitalize">
            {encabezadoVista(fechaActual, vistaActual)}
          </span>
          <button
            onClick={() => navegar(1)}
            className="p-1.5 rounded-md hover:bg-paper transition-colors text-muted"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <span className="flex-1" />
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors"
        >
          <CalendarPlus size={18} strokeWidth={1.75} /> Nueva cita
        </button>
      </div>

      {vistaActual === "dia" ? (
        <Card className="overflow-x-auto">
          <TablaSimple citas={citas} onBorrar={borrar} />
        </Card>
      ) : (
        <div className="space-y-4">
          {diasOrdenados.length === 0 && (
            <Card>
              <p className="px-5 py-10 text-center text-muted text-[13.5px]">
                No hay citas en este período.
              </p>
            </Card>
          )}
          {diasOrdenados.map((dia) => (
            <Card key={dia} className="overflow-x-auto">
              <div className="px-5 py-3 border-b border-line">
                <h3 className="font-semibold text-[14px] text-ink capitalize">
                  {formatearDia(dia)}
                </h3>
                <p className="text-[12px] text-muted">
                  {citasPorDia[dia].length} cita
                  {citasPorDia[dia].length !== 1 ? "s" : ""}
                </p>
              </div>
              <TablaSimple citas={citasPorDia[dia]} onBorrar={borrar} />
            </Card>
          ))}
        </div>
      )}

      <p className="text-[12px] text-muted mt-3 flex items-center gap-1.5">
        <MessageCircle size={13} className="text-success" /> Las citas confirmadas por el bot
        aparecen aquí automáticamente.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva cita"
        onSubmit={guardar}
        submitLabel={saving ? "Guardando…" : "Agendar cita"}
      >
        <Field label="Cliente" full>
          <Input
            value={form.cliente}
            onChange={(e) => set("cliente", e.target.value)}
            placeholder="Nombre del cliente"
            required
          />
        </Field>
        <Field label="Asunto">
          <Input
            value={form.asunto}
            onChange={(e) => set("asunto", e.target.value)}
            placeholder="Divorcio, consulta…"
          />
        </Field>
        <Field label="Hora">
          <Input type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)} />
        </Field>
        <Field label="Teléfono">
          <Input
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            placeholder="961 123 4567"
          />
        </Field>
        <Field label="Sucursal">
          <Select options={sucursales} value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} />
        </Field>
        <Field label="Abogado" full>
          <Select options={abogados} value={form.abogado} onChange={(e) => set("abogado", e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
