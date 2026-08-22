"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, LogIn, LogOut, MapPin, MapPinOff, Pencil, AlertTriangle, RefreshCw } from "lucide-react";
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
  clasificacion: "puntual" | "retardo_menor" | "retardo_mayor" | "sin_horario" | null;
  justificada: boolean;
  motivo: string | null;
  hora: string;
};

export type AbogadoResumen = {
  id: string;
  nombre: string;
  tienePin: boolean;
  sucursal: string;
  horaEntrada: string | null;
  puntuales: number;
  retardosMenores: number;
  retardosMayores: number;
  justificados: number;
  diasDescuento: number;
  semaforo: "ok" | "atencion" | "critico";
  alerta: string | null;
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
const REFRESCO_MS = 30_000;

// Reglamento del despacho (17-ago-2026).
const SEMAFORO: Record<string, { punto: string; fila: string; texto: string }> = {
  ok: { punto: "bg-success", fila: "", texto: "text-success" },
  atencion: { punto: "bg-amber", fila: "bg-amber-wash/40", texto: "text-amber" },
  critico: { punto: "bg-danger", fila: "bg-danger-wash/50", texto: "text-danger" },
};

const CLASIFICACION: Record<string, { etiqueta: string; clase: string }> = {
  puntual: { etiqueta: "A tiempo", clase: "bg-success-wash text-success" },
  retardo_menor: { etiqueta: "Retardo menor", clase: "bg-amber-wash text-amber" },
  retardo_mayor: { etiqueta: "Retardo mayor", clase: "bg-danger-wash text-danger" },
  sin_horario: { etiqueta: "Sin horario", clase: "bg-line/60 text-muted" },
};
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
  mes,
}: {
  checadas: ChecadaView[];
  resumen: AbogadoResumen[];
  sucursales: SucursalGeocerca[];
  dias: number;
  sucursalId: string;
  mes: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<SucursalGeocerca | null>(null);
  const [ultimaCarga, setUltimaCarga] = useState<Date | null>(null);

  // El panel se queda abierto en recepción mientras la gente va llegando, así que se
  // refresca solo. Se pausa con la pestaña oculta: sin eso seguiría consultando toda
  // la noche en la computadora que nadie apagó.
  useEffect(() => {
    setUltimaCarga(new Date());
    const tick = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setUltimaCarga(new Date());
      }
    };
    const id = setInterval(tick, REFRESCO_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  function irCon(nuevoDias: number, nuevaSucursal: string) {
    const p = new URLSearchParams();
    p.set("dias", String(nuevoDias));
    if (nuevaSucursal) p.set("sucursal", nuevaSucursal);
    router.push(`/reloj-checador?${p.toString()}`);
  }

  const sucursalIds = Object.fromEntries([["", ""], ...sucursales.map((s) => [s.nombre, s.id])]);
  const sinPin = resumen.filter((a) => !a.tienePin).length;
  // Los críticos primero: son los que ya cruzaron un umbral del reglamento.
  const alertas = resumen
    .filter((a) => a.alerta)
    .sort((x, y) => (x.semaforo === "critico" ? -1 : 1) - (y.semaforo === "critico" ? -1 : 1));

  return (
    <>
      <PageTitle
        eyebrow="Despacho"
        title="Reloj checador"
        subtitle={`${checadas.length} checada${checadas.length !== 1 ? "s" : ""} en los últimos ${dias} días`}
      />

      <p className="text-[12.5px] text-muted -mt-3 mb-5 flex items-center gap-1.5">
        <RefreshCw size={12} />
        Se actualiza solo cada {REFRESCO_MS / 1000} segundos
        {ultimaCarga && (
          <span className="num">
            · última {ultimaCarga.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </p>

      {alertas.length > 0 && (
        <Card className="overflow-hidden mb-5 border-danger/30">
          <div className="px-5 py-3 border-b border-line bg-danger-wash/40">
            <h3 className="font-serif text-[17px] text-danger flex items-center gap-2">
              <AlertTriangle size={16} /> Requiere atención
            </h3>
          </div>
          <ul className="divide-y divide-line/70">
            {alertas.map((a) => (
              <li key={a.id} className="px-5 py-2.5 text-[13.5px] flex items-start gap-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${SEMAFORO[a.semaforo].punto}`} />
                <span>{a.alerta}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
          <h3 className="font-serif text-[17px] capitalize">Asistencia de {mes}</h3>
          <p className="text-[12.5px] text-muted mt-0.5">
            Reglamento del 17 de agosto: hasta +15 min es a tiempo, +16 retardo menor (½ día),
            +32 retardo mayor (1 día). Cinco menores = 1 día; cinco mayores = causal de despido.
          </p>
        </div>
        <table className="w-full min-w-[680px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="eyebrow text-muted px-5 py-3">Abogado</th>
              <th className="eyebrow text-muted px-3 py-3">Sucursal</th>
              <th className="eyebrow text-muted px-3 py-3">PIN</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">A tiempo</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Ret. menores</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Ret. mayores</th>
              <th className="eyebrow text-muted px-3 py-3 text-right">Días desc.</th>
              <th className="eyebrow text-muted px-3 py-3">Última checada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {resumen.map((a) => (
              <tr
                key={a.id}
                title={a.alerta ?? undefined}
                className={`hover:bg-paper/60 transition-colors ${SEMAFORO[a.semaforo].fila}`}
              >
                <td className="px-5 py-3 font-bold">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO[a.semaforo].punto}`}
                      aria-label={a.semaforo}
                    />
                    {a.nombre}
                  </span>
                </td>
                <td className="px-3 py-3 text-muted">{a.sucursal}</td>
                <td className="px-3 py-3">
                  {a.tienePin ? (
                    <span className="text-[12px] text-success inline-flex items-center gap-1">
                      <Check size={12} /> Sí
                    </span>
                  ) : (
                    <span className="text-[12px] text-amber font-bold">Sin PIN</span>
                  )}
                </td>
                <td className="px-3 py-3 num text-right text-success">{a.puntuales || "—"}</td>
                <td className="px-3 py-3 num text-right">
                  {a.retardosMenores > 0 ? (
                    <span className="text-amber font-bold">{a.retardosMenores}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-3 num text-right">
                  {a.retardosMayores > 0 ? (
                    <span className="text-danger font-bold">{a.retardosMayores}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-3 num text-right">
                  {a.diasDescuento > 0 ? (
                    <span className="font-bold text-danger">{a.diasDescuento}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                  {a.justificados > 0 && (
                    <span className="block text-[11px] text-muted">{a.justificados} justif.</span>
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
              <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">Sin abogados activos.</td></tr>
            )}
          </tbody>
        </table>
        <p className="text-[12px] text-muted px-5 py-3">
          Los retardos justificados (audiencias, diligencias, trámites) no cuentan para la
          acumulación. Sólo se clasifican las sucursales con hora de entrada configurada.
        </p>
        {sinPin > 0 && (
          <p className="text-[12.5px] px-5 pb-3 -mt-1 flex items-start gap-1.5 text-amber">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              <b>{sinPin} persona{sinPin !== 1 ? "s" : ""} sin PIN.</b> Sólo pueden checar desde un
              celular donde ya tengan la sesión iniciada. Cada quien puede ponerse el suyo en
              Mi PIN, o cargarlo aquí en Configuración › Usuarios.
            </span>
          </p>
        )}
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
              <th className="eyebrow text-muted px-3 py-3">Puntualidad</th>
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
                <td className="px-3 py-3">
                  {c.clasificacion ? (
                    <span
                      title={c.justificada && c.motivo ? `Justificado: ${c.motivo}` : undefined}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold ${
                        c.justificada ? "bg-navy-wash text-navy" : CLASIFICACION[c.clasificacion].clase
                      }`}
                    >
                      {c.justificada ? "Justificado" : CLASIFICACION[c.clasificacion].etiqueta}
                    </span>
                  ) : (
                    <span className="text-muted text-[12px]">—</span>
                  )}
                </td>
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
                <td colSpan={7} className="px-5 py-10 text-center text-muted">
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
