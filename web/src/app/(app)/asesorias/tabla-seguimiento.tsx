"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Card, FilterSelect } from "@/components/ui";
import { Modal, Field, Input, Select, Textarea } from "@/components/modal";
import { crearCitaAction } from "../agenda/actions";
import FirmaContratoModal, { type AsesoriaFirma } from "./firma-contrato-modal";
import { guardarSeguimientoCitaAction, guardarSeguimientoAsesoriaLlamadaAction } from "./actions";

export type FilaSeguimiento = {
  id: string;
  fecha: string; // dd/mm/yyyy de la cita o de la asesoría
  cliente: string;
  telefono: string;
  sucursal: string;
  abogado: string;
  llamo: string; // quién hizo la llamada de seguimiento
  seguimientoEstado: string;
  seguimientoNota: string;
  seguimientoFecha: string; // yyyy-mm-dd
};

type Origen = "cita" | "asesoria";

const ESTADOS = [
  { value: "", label: "Por contactar", cls: "bg-amber-wash text-amber" },
  { value: "no_contesto", label: "No contestó", cls: "bg-paper text-muted" },
  { value: "llamar_despues", label: "Llamar después", cls: "bg-blue-50 text-blue-700" },
  { value: "agendo_cita", label: "Agendó cita", cls: "bg-success-wash text-success" },
  { value: "descartado", label: "Descartado", cls: "bg-danger-wash text-danger" },
];

const CITA_VACIA = { fecha: "", hora: "", sucursal: "", abogado: "", asunto: "" };

function Fila({
  f,
  origen,
  onFirmar,
  onAgendar,
  hoy,
  miNombre,
  esAdmin,
  abogados,
}: {
  f: FilaSeguimiento;
  origen: Origen;
  onFirmar: (a: AsesoriaFirma) => void;
  onAgendar: (f: FilaSeguimiento) => void;
  hoy: string;
  miNombre: string;
  esAdmin: boolean;
  abogados: string[];
}) {
  const [estado, setEstado] = useState(f.seguimientoEstado);
  const [nota, setNota] = useState(f.seguimientoNota);
  const [fecha, setFecha] = useState(f.seguimientoFecha);
  const [llamo, setLlamo] = useState(f.llamo);
  const [, startTransition] = useTransition();

  function guardar(cambios: Partial<{ estado: string; nota: string; fecha: string; llamo: string }>) {
    const siguiente = { estado, nota, fecha, llamo: llamo || miNombre, ...cambios };
    // Sin fecha no hay bloqueo del día: al llamar se registra hoy.
    if (!siguiente.fecha) { siguiente.fecha = hoy; setFecha(hoy); }
    const accion = origen === "cita" ? guardarSeguimientoCitaAction : guardarSeguimientoAsesoriaLlamadaAction;
    startTransition(async () => { setLlamo(await accion(f.id, siguiente)); });
  }

  // Ya la llamó otra persona hoy: se bloquea el resto del día (igual que en Prospectos). Quien
  // llamó y el admin sí pueden seguir editando; mañana se libera sola.
  const bloqueada = !!llamo && fecha === hoy && llamo !== miNombre && !esAdmin;

  return (
    <tr className="hover:bg-paper/40 transition-colors">
      <td className="px-5 py-3 num text-muted whitespace-nowrap">{f.fecha}</td>
      <td className="px-3 py-3">
        <p className="font-bold text-ink">{f.cliente}</p>
        {f.telefono && (
          <p className="text-[11.5px] num text-muted"><Phone size={11} className="inline mr-1" />{f.telefono}</p>
        )}
      </td>
      <td className="px-3 py-3 text-muted">{f.sucursal}</td>
      <td className="px-3 py-3 text-muted">{f.abogado}</td>
      <td className="px-3 py-3 text-muted">
        {esAdmin ? (
          <select
            value={llamo}
            onChange={(e) => { setLlamo(e.target.value); guardar({ llamo: e.target.value }); }}
            className="px-2 py-1 rounded border border-line text-[12px] bg-transparent max-w-[170px]"
          >
            <option value="">—</option>
            {(abogados.includes(llamo) || !llamo ? abogados : [llamo, ...abogados]).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        ) : (
          llamo || "—"
        )}
      </td>
      <td className="px-3 py-3">
        <select
          value={estado}
          disabled={bloqueada}
          title={bloqueada ? `Ya la llamó ${llamo} hoy` : undefined}
          onChange={(e) => {
            const nuevo = e.target.value;
            setEstado(nuevo);
            guardar({ estado: nuevo });
            if (nuevo === "agendo_cita" && estado !== "agendo_cita") onAgendar(f);
          }}
          className={`px-2 py-1 rounded text-[11.5px] font-bold border-0 cursor-pointer ${ESTADOS.find((e) => e.value === estado)?.cls}`}
        >
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-3">
        <input
          type="date"
          value={fecha}
          disabled={bloqueada}
          onChange={(e) => { setFecha(e.target.value); guardar({ fecha: e.target.value }); }}
          className="px-2 py-1 rounded border border-line text-[12px] bg-transparent"
        />
      </td>
      <td className="px-3 py-3 min-w-[220px]">
        <input
          type="text"
          value={nota}
          disabled={bloqueada}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => { if (nota !== f.seguimientoNota) guardar({ nota }); }}
          placeholder="Nota de la llamada…"
          className="w-full px-2 py-1 rounded bg-surface border border-line focus:border-navy/40 focus:outline-none text-[12.5px] placeholder:text-muted/60"
        />
      </td>
      {origen === "asesoria" && (
        <td className="px-3 py-3 text-right">
          <button
            onClick={() => onFirmar({ id: f.id, nombre: f.cliente })}
            className="px-2.5 py-1 rounded-md bg-success-wash text-success text-[12px] font-bold hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            + Nuevo contrato
          </button>
        </td>
      )}
    </tr>
  );
}

export default function TablaSeguimiento({
  filas,
  origen,
  encabezadoFecha,
  vacio,
  filtrarPor,
  sucursales,
  abogados,
  hoy,
  miNombre,
  esAdmin,
}: {
  filas: FilaSeguimiento[];
  origen: Origen;
  encabezadoFecha: string;
  vacio: string;
  /** Muestra un filtro por esa columna (abogado o sucursal) cuando hay más de un valor. */
  filtrarPor?: "abogado" | "sucursal";
  sucursales: string[];
  abogados: string[];
  hoy: string;
  miNombre: string;
  esAdmin: boolean;
}) {
  const [filtro, setFiltro] = useState("");
  const opciones = filtrarPor ? [...new Set(filas.map((f) => f[filtrarPor]))].sort() : [];
  const visibles = filtro && filtrarPor ? filas.filter((f) => f[filtrarPor] === filtro) : filas;
  const porContactar = visibles.filter((f) => !f.seguimientoEstado).length;
  const [firmando, setFirmando] = useState<AsesoriaFirma | null>(null);
  const router = useRouter();

  // Al marcar "Agendó cita" se abre el mismo formulario que en Prospectos, para que la cita
  // quede real en Agenda con fecha y hora.
  const [citaDe, setCitaDe] = useState<FilaSeguimiento | null>(null);
  const [citaForm, setCitaForm] = useState(CITA_VACIA);
  const [citaGuardando, setCitaGuardando] = useState(false);

  function abrirModalCita(f: FilaSeguimiento) {
    setCitaForm({
      ...CITA_VACIA,
      sucursal: sucursales.includes(f.sucursal) ? f.sucursal : "",
      abogado: abogados.includes(f.abogado) ? f.abogado : "",
    });
    setCitaDe(f);
  }

  async function guardarCita() {
    if (!citaDe) return;
    setCitaGuardando(true);
    await crearCitaAction({
      cliente: citaDe.cliente,
      asunto: citaForm.asunto,
      telefono: citaDe.telefono,
      fecha: citaForm.fecha,
      hora: citaForm.hora,
      sucursal: citaForm.sucursal,
      abogado: citaForm.abogado,
    });
    setCitaGuardando(false);
    setCitaDe(null);
    router.refresh();
  }
  return (
    <>
      <FirmaContratoModal asesoria={firmando} onClose={() => setFirmando(null)} />
      <Modal
        open={!!citaDe}
        onClose={() => setCitaDe(null)}
        title={`Agendar cita — ${citaDe?.cliente ?? ""}`}
        onSubmit={guardarCita}
        submitLabel={citaGuardando ? "Guardando…" : "Agendar cita"}
      >
        <Field label="Fecha">
          <Input type="date" value={citaForm.fecha} onChange={(e) => setCitaForm((c) => ({ ...c, fecha: e.target.value }))} required />
        </Field>
        <Field label="Hora">
          <Input type="time" value={citaForm.hora} onChange={(e) => setCitaForm((c) => ({ ...c, hora: e.target.value }))} />
        </Field>
        <Field label="Sucursal">
          <Select options={sucursales} value={citaForm.sucursal} onChange={(e) => setCitaForm((c) => ({ ...c, sucursal: e.target.value }))} />
        </Field>
        <Field label="Abogado">
          <Select options={abogados} value={citaForm.abogado} onChange={(e) => setCitaForm((c) => ({ ...c, abogado: e.target.value }))} />
        </Field>
        <Field label="Motivo" full>
          <Textarea value={citaForm.asunto} onChange={(e) => setCitaForm((c) => ({ ...c, asunto: e.target.value }))} />
        </Field>
      </Modal>
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <Card className="p-5">
          <p className="eyebrow text-muted">En la lista</p>
          <p className="num text-[34px] font-semibold leading-none mt-3 text-ink">{visibles.length}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow text-muted">Por contactar</p>
          <p className="num text-[34px] font-semibold leading-none mt-3 text-amber">{porContactar}</p>
        </Card>
      </div>
      {filtrarPor && opciones.length > 1 && (
        <div className="mb-4">
          <FilterSelect label={filtrarPor === "abogado" ? "Abogado" : "Sucursal"} value={filtro} onChange={setFiltro} options={opciones} />
        </div>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">{encabezadoFecha}</th>
              <th className="eyebrow text-muted px-3 py-3">Persona</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Llamó</th>
              <th className="eyebrow text-muted px-3 py-3">Estado</th>
              <th className="eyebrow text-muted px-3 py-3">Fecha llamada</th>
              <th className="eyebrow text-muted px-3 py-3">Nota</th>
              {origen === "asesoria" && <th className="px-3 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {visibles.map((f) => <Fila key={f.id} f={f} origen={origen} onFirmar={setFirmando} onAgendar={abrirModalCita} hoy={hoy} miNombre={miNombre} esAdmin={esAdmin} abogados={abogados} />)}
            {visibles.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-10 text-center text-muted">{vacio}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
