"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader, LogIn, LogOut, KeyRound, MapPin, MapPinOff } from "lucide-react";
import { registrarChecadaSesion, registrarChecadaPin, type ResultadoChecada, type Ubicacion } from "../actions";
import type { Geocerca } from "./mapa";

// Leaflet toca window al importarse, asi que el minimapa no puede renderizarse en el servidor.
const MapaGeocerca = dynamic(() => import("./mapa"), {
  ssr: false,
  loading: () => <div className="mt-5 h-[200px] rounded-xl bg-line/60 animate-pulse" />,
});

type Sesion = { nombre: string; tipoSugerido: "entrada" | "salida" } | null;

const ETIQUETA: Record<"entrada" | "salida", string> = { entrada: "Entrada", salida: "Salida" };

type MotivoSinGps = "denegado" | "sin_senal" | "no_soportado" | null;

// Intenta obtener el GPS del celular. Devuelve también POR QUÉ falló: "denegado"
// es el único caso accionable por la persona (el navegador recuerda un permiso
// negado y ya no vuelve a preguntar, así que sin este aviso parece que la app
// nunca pidió la ubicación). Sin GPS la checada se guarda igual, marcada como
// no verificada y visible así para el admin.
function obtenerUbicacion(): Promise<{ ubicacion: Ubicacion; motivo: MotivoSinGps }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ ubicacion: null, motivo: "no_soportado" });
    let resuelto = false;
    const terminar = (r: { ubicacion: Ubicacion; motivo: MotivoSinGps }) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(limite);
      resolve(r);
    };
    const limite = setTimeout(() => terminar({ ubicacion: null, motivo: "sin_senal" }), 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        terminar({
          ubicacion: { lat: pos.coords.latitude, lon: pos.coords.longitude, precision: pos.coords.accuracy },
          motivo: null,
        }),
      (err) =>
        terminar({
          ubicacion: null,
          motivo: err.code === err.PERMISSION_DENIED ? "denegado" : "sin_senal",
        }),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  });
}

const AVISO_SIN_GPS: Record<Exclude<MotivoSinGps, null>, string> = {
  denegado:
    "Tu navegador tiene bloqueada la ubicación para este sitio y ya no vuelve a preguntar. Abre el candado de la barra de direcciones, permite la ubicación y vuelve a intentar.",
  sin_senal: "No se pudo leer el GPS a tiempo. Sal a un lugar con señal y vuelve a intentar.",
  no_soportado: "Este navegador no soporta ubicación.",
};

export default function CheckarClient({
  sucursalSlug,
  sucursalNombre,
  sesion,
  geocerca,
}: {
  sucursalSlug: string;
  sucursalNombre: string;
  sesion: Sesion;
  geocerca: Geocerca | null;
}) {
  const [usarPin, setUsarPin] = useState(!sesion);
  const [pin, setPin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [error, setError] = useState("");
  const [avisoGps, setAvisoGps] = useState<MotivoSinGps>(null);
  const [miUbicacion, setMiUbicacion] = useState<{ lat: number; lon: number } | null>(null);
  const [resultado, setResultado] = useState<Extract<ResultadoChecada, { ok: true }> | null>(null);

  useEffect(() => {
    if (!geocerca) return;
    let vivo = true;
    obtenerUbicacion().then(({ ubicacion, motivo }) => {
      if (!vivo) return;
      if (ubicacion) setMiUbicacion({ lat: ubicacion.lat, lon: ubicacion.lon });
      setAvisoGps(motivo);
    });
    return () => {
      vivo = false;
    };
  }, [geocerca]);

  async function conSesion() {
    setError("");
    setUbicando(true);
    const { ubicacion, motivo } = await obtenerUbicacion();
    setAvisoGps(motivo);
    if (ubicacion) setMiUbicacion({ lat: ubicacion.lat, lon: ubicacion.lon });
    setUbicando(false);
    setCargando(true);
    const r = await registrarChecadaSesion(sucursalSlug, ubicacion);
    if (r.ok) setResultado(r);
    else setError(r.error);
    setCargando(false);
  }

  async function conPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUbicando(true);
    const { ubicacion, motivo } = await obtenerUbicacion();
    setAvisoGps(motivo);
    if (ubicacion) setMiUbicacion({ lat: ubicacion.lat, lon: ubicacion.lon });
    setUbicando(false);
    setCargando(true);
    const r = await registrarChecadaPin(pin, sucursalSlug, ubicacion);
    if (r.ok) {
      setResultado(r);
      setPin("");
    } else {
      setError(r.error);
    }
    setCargando(false);
  }

  const trabajando = ubicando || cargando;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="w-14 h-14 rounded-lg overflow-hidden mb-5 mx-auto bg-navy-deep/10">
          <img src="/Logo.jpg" alt="" className="w-full h-full object-cover" />
        </div>
        <p className="eyebrow text-amber text-center">Reloj checador</p>
        <h1 className="font-serif text-[26px] text-ink leading-tight mt-1 mb-1 text-center">{sucursalNombre}</h1>

        {!resultado && geocerca && <MapaGeocerca geocerca={geocerca} yo={miUbicacion} />}

        {resultado ? (
          <div className="mt-6 text-center bg-success-wash rounded-xl px-5 py-6">
            <p className="text-success font-bold text-[17px]">
              {ETIQUETA[resultado.tipo]} registrada
            </p>
            <p className="text-ink text-[14px] mt-1">{resultado.nombre}</p>
            <p className="text-muted text-[12.5px] mt-1">
              {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[11.5px] mt-2 flex items-center justify-center gap-1 text-muted">
              {resultado.enSitio ? (
                <>
                  <MapPin size={12} className="text-success" /> Ubicación verificada
                </>
              ) : (
                <>
                  <MapPinOff size={12} /> Ubicación no verificada
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            {sesion && !usarPin ? (
              <div className="mt-6 text-center">
                <p className="text-muted text-[14px] mb-4">Hola, {sesion.nombre}</p>
                <button
                  onClick={conSesion}
                  disabled={trabajando}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-navy text-white text-[16px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
                >
                  {trabajando ? (
                    <Loader size={18} className="animate-spin" />
                  ) : sesion.tipoSugerido === "entrada" ? (
                    <LogIn size={18} />
                  ) : (
                    <LogOut size={18} />
                  )}
                  {ubicando ? "Ubicando…" : `Registrar ${ETIQUETA[sesion.tipoSugerido].toLowerCase()}`}
                </button>
                <button
                  onClick={() => setUsarPin(true)}
                  className="mt-3 text-[12.5px] text-muted hover:text-ink transition-colors inline-flex items-center gap-1"
                >
                  <KeyRound size={13} /> No soy yo, checar con PIN
                </button>
              </div>
            ) : (
              <form onSubmit={conPin} className="mt-6 space-y-3">
                <label className="block">
                  <span className="eyebrow text-muted block mb-1.5 text-center">Tu PIN</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="••••"
                    required
                    className="w-full px-4 py-3.5 rounded-lg bg-surface border border-line text-[22px] text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
                  />
                </label>
                <button
                  type="submit"
                  disabled={trabajando}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-navy text-white text-[16px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
                >
                  {trabajando && <Loader size={18} className="animate-spin" />}
                  {ubicando ? "Ubicando…" : cargando ? "Registrando…" : "Checar"}
                </button>
                {sesion && (
                  <button
                    type="button"
                    onClick={() => setUsarPin(false)}
                    className="w-full text-[12.5px] text-muted hover:text-ink transition-colors"
                  >
                    Usar mi sesión ({sesion.nombre})
                  </button>
                )}
              </form>
            )}
            {error && <p className="text-[13px] text-danger bg-danger-wash rounded-lg px-3 py-2 mt-4 text-center">{error}</p>}
            {avisoGps && (
              <p className="text-[12.5px] text-muted bg-amber-wash rounded-lg px-3 py-2 mt-3 flex items-start gap-2">
                <MapPinOff size={14} className="shrink-0 mt-0.5" /> {AVISO_SIN_GPS[avisoGps]}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
