"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, LogIn, LogOut, MapPin, MapPinOff, Pencil, AlertTriangle } from "lucide-react";
import { PageTitle, Card } from "@/components/ui";
import { Select, Field, Input, Modal } from "@/components/modal";
import { actualizarGeocercaAction } from "./actions";

export type ChecadaView = {
  id: string;
  abogado: string;
  sucursal: string;
  tipo: string;
  origen: string;
  enSitio: boolean | null;
  hora: string;
};

export type AbogadoResumen = {
  id: string;
  nombre: string;
  sucursal: string;
  horaEntrada: string | null;
  entradas: number;
  puntual: number | null; // null = la sucursal no tiene hora de entrada configurada
  ultimaChecada: string | null;
  diasSinChecar: number | null;
};

export type SucursalGeocerca = {
  id: string;
  nombre: string;
  urlChecar: string;
  lat: number | null;
  lon: number | null;
  radioM: number;
  horaEntrada: string | null;
};

const RANGOS = [7, 30, 90];
const ORIGEN_LABEL: Record<string, string> = { sesion: "Sesión", pin: "PIN" };
const ALERTA_DIAS_SIN_CHECAR = 3;

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors shrink-0"
      title="Copiar URL"
    >
      {copiado ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}

function ModalGeocerca({ sucursal, onClose }: { sucursal: SucursalGeocerca; onClose: () => void }) {
  const router = useRouter();
  const [lat, setLat] = useState(sucursal.lat?.toString() ?? "");
  const [lon, setLon] = useState(sucursal.lon?.toString() ?? "");
  const [radioM, setRadioM] = useState(sucursal.radioM.toString());
  const [horaEntrada, setHoraEntrada] = useState(sucursal.horaEntrada ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setError("");
    setGuardando(true);
    try {
      await actualizarGeocercaAction(sucursal.id, { lat, lon, radioM, horaEntrada });
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
    setGuardando(false);
  }

  return (
    <Modal open onClose={onClose} title={`Geocerca — ${sucursal.nombre}`} onSubmit={guardar} submitLabel={guardando ? "Guardando…" : "Guardar"}>
      <p className="col-span-full text-[12.5px] text-muted -mt-1">
        Saca la latitud/longitud de Google Maps: clic derecho sobre la sucursal → clic en las coordenadas para copiarlas.
        Deja lat/lon vacíos para no exigir ubicación en esta sucursal.
      </p>
      <Field label="Latitud"><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="16.7531" /></Field>
      <Field label="Longitud"><Input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-93.1156" /></Field>
      <Field label="Radio permitido (metros)"><Input value={radioM} onChange={(e) => setRadioM(e.target.value)} placeholder="100" /></Field>
      <Field label="Hora de entrada (opcional, para puntualidad)">
        <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} />
      </Field>
      {error && <p className="col-span-full text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  );
}

export default function ChecadorClient({
  checadas,
  resumen,
  sucursales,
  dias,
  sucursalId,
}: {
  checadas: ChecadaView[];
  resumen: AbogadoResumen[];
  sucursales: SucursalGeocerca[];
  dias: number;
  sucursalId: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<SucursalGeocerca | null>(null);

  function irCon(nuevoDias: number, nuevaSucursal: string) {
    const p = new URLSearchParams();
    p.set("dias", String(nuevoDias));
    if (nuevaSucursal) p.set("sucursal", nuevaSucursal);
    router.push(`/reloj-checador?${p.toString()}`);
  }

  const sucursalIds = Object.fromEntries([["", ""], ...sucursales.map((s) => [s.nombre, s.id])]);

  return (
    <>
      <PageTitle
        eyebrow="Despacho"
        title="Reloj checador"
        subtitle={`${checadas.length} checada${checadas.length !== 1 ? "s" : ""} en los últimos ${dias} días`}
      />

      <Card className="overflow-hidden mb-5">
        <div className="px-5 py-3.5 border-b border-line">
          <h3 className="font-serif text-[17px]">Sucursales</h3>
          <p className="text-[12.5px] text-muted mt-0.5">
            La URL se graba en la etiqueta NFC. La geocerca y la hora de entrada son opcionales.
          </p>
        </div>
        <div className="divide-y divide-line/70">
          {sucursales.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-2.5 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-bold shrink-0">{s.nombre}</span>
                  {s.lat != null ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-success"><MapPin size={11} /> {s.radioM} m</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted"><MapPinOff size={11} /> sin geocerca</span>
                  )}
                  {s.horaEntrada && <span className="text-[11px] text-muted">· entrada {s.horaEntrada}</span>}
                </div>
                <span className="text-[12px] text-muted num truncate block">{s.urlChecar}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <BotonCopiar texto={s.urlChecar} />
                <button
                  onClick={() => setEditando(s)}
                  className="p-1.5 rounded-md text-muted hover:text-navy hover:bg-navy/[.06] transition-colors"
                  title="Configurar geocerca"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-line overflow-hidden text-[13px]">
          {RANGOS.map((r) => (
            <button
              key={r}
              onClick={() => irCon(r, sucursalId)}
              className={`px-4 py-2 font-medium transition-colors ${
                dias === r ? "bg-navy text-white" : "hover:bg-paper text-muted"
              }`}
            >
              {r} días
            </button>
          ))}
        </div>
        <div className="w-48">
          <Select
            options={sucursales.map((s) => s.nombre)}
            value={sucursales.find((s) => s.id === sucursalId)?.nombre ?? ""}
            onChange={(e) => irCon(dias, sucursalIds[e.target.value] ?? "")}
          />
        </div>
      </div>

      <Card className="overflow-x-auto mb-5">
        <div className="px-5 py-3.5 border-b border-line">
          <h3 className="font-serif text-[17px]">Resumen por abogado</h3>
          <p className="text-[12.5px] text-muted mt-0.5">Puntualidad del período · última vez que marcó (histórico completo).</p>
        </div>
        <table className="w-full min-w-[680px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Entradas</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">A tiempo</th>
              <th className="eyebrow text-muted px-3 py-3">Última checada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {resumen.map((a) => (
              <tr key={a.id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3 font-bold">{a.nombre}</td>
                <td className="px-3 py-3 text-muted">{a.sucursal}</td>
                <td className="px-3 py-3 num text-right">{a.entradas}</td>
                <td className="px-3 py-3 num text-right">
                  {a.puntual == null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className={a.puntual < a.entradas ? "text-amber font-bold" : "text-success font-bold"}>
                      {a.puntual}/{a.entradas}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {a.ultimaChecada ? (
                    <span className={a.diasSinChecar != null && a.diasSinChecar >= ALERTA_DIAS_SIN_CHECAR ? "text-danger font-bold flex items-center gap-1" : "text-muted"}>
                      {a.diasSinChecar != null && a.diasSinChecar >= ALERTA_DIAS_SIN_CHECAR && <AlertTriangle size={13} />}
                      {a.ultimaChecada}
                    </span>
                  ) : (
                    <span className="text-danger font-bold flex items-center gap-1"><AlertTriangle size={13} /> Nunca ha checado</span>
                  )}
                </td>
              </tr>
            ))}
            {resumen.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Sin abogados activos.</td></tr>
            )}
          </tbody>
        </table>
        <p className="text-[12px] text-muted px-5 py-3">
          "A tiempo" solo cuenta en sucursales con hora de entrada configurada (tolerancia {10} min). En rojo, quien no ha checado en {ALERTA_DIAS_SIN_CHECAR}+ días.
        </p>
      </Card>

      <Card className="overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-line">
          <h3 className="font-serif text-[17px]">Detalle de checadas</h3>
        </div>
        <table className="w-full min-w-[720px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">Tipo</th>
              <th className="eyebrow text-muted px-3 py-3">Hora</th>
              <th className="eyebrow text-muted px-3 py-3">Origen</th>
              <th className="eyebrow text-muted px-3 py-3">Ubicación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {checadas.map((c) => (
              <tr key={c.id} className="hover:bg-paper/60 transition-colors">
                <td className="px-5 py-3 font-bold">{c.abogado}</td>
                <td className="px-3 py-3 text-muted">{c.sucursal}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold ${
                      c.tipo === "entrada" ? "bg-success-wash text-success" : "bg-amber-wash text-amber"
                    }`}
                  >
                    {c.tipo === "entrada" ? <LogIn size={12} /> : <LogOut size={12} />}
                    {c.tipo === "entrada" ? "Entrada" : "Salida"}
                  </span>
                </td>
                <td className="px-3 py-3 num text-muted capitalize">{c.hora}</td>
                <td className="px-3 py-3 text-muted">{ORIGEN_LABEL[c.origen] ?? c.origen}</td>
                <td className="px-3 py-3">
                  {c.enSitio ? (
                    <span className="inline-flex items-center gap-1 text-success text-[12px]"><MapPin size={12} /> Verificada</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted text-[12px]"><MapPinOff size={12} /> Sin verificar</span>
                  )}
                </td>
              </tr>
            ))}
            {checadas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  Sin checadas en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editando && <ModalGeocerca sucursal={editando} onClose={() => setEditando(null)} />}
    </>
  );
}
