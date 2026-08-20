"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { distanciaMetros } from "@/lib/checador-regla";

export type Geocerca = { lat: number; lon: number; radioM: number };

const AZUL = "#0891B2";
const VERDE = "#22C55E";

// Minimapa de OpenStreetMap: círculo azul = área de la sucursal, punto verde =
// donde te ubicó el GPS. Es informativo; quien decide si la checada entra es el
// servidor, que además conoce el margen de imprecisión del GPS.
export default function MapaGeocerca({ geocerca, yo }: { geocerca: Geocerca; yo: { lat: number; lon: number } | null }) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const marcador = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!div.current || mapa.current) return;
    const m = L.map(div.current, { zoomControl: false, attributionControl: false }).setView(
      [geocerca.lat, geocerca.lon],
      17
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
    L.circle([geocerca.lat, geocerca.lon], {
      radius: geocerca.radioM,
      color: AZUL,
      fillColor: AZUL,
      fillOpacity: 0.15,
    }).addTo(m);
    L.circleMarker([geocerca.lat, geocerca.lon], { radius: 7, color: AZUL, fillColor: AZUL, fillOpacity: 1 })
      .addTo(m)
      .bindTooltip("Área de la sucursal");
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
      marcador.current = null;
    };
  }, [geocerca.lat, geocerca.lon, geocerca.radioM]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !yo) return;
    if (marcador.current) marcador.current.setLatLng([yo.lat, yo.lon]);
    else
      marcador.current = L.circleMarker([yo.lat, yo.lon], {
        radius: 7,
        color: VERDE,
        fillColor: VERDE,
        fillOpacity: 1,
      })
        .addTo(m)
        .bindTooltip("Tu celular");
    m.fitBounds(L.latLngBounds([[geocerca.lat, geocerca.lon], [yo.lat, yo.lon]]).pad(0.4));
  }, [yo, geocerca.lat, geocerca.lon]);

  const distancia = yo ? Math.round(distanciaMetros(geocerca.lat, geocerca.lon, yo.lat, yo.lon)) : null;

  return (
    <div className="mt-5">
      <div ref={div} className="h-[200px] rounded-xl overflow-hidden bg-line z-0" />
      <p className="text-[12.5px] text-muted mt-2 text-center">
        {distancia == null
          ? "Buscando tu ubicación…"
          : distancia <= geocerca.radioM
          ? `Estás dentro del área permitida (a ${distancia} m).`
          : `Estás a ${distancia} m, fuera del área de ${geocerca.radioM} m. Acércate para poder checar.`}
      </p>
    </div>
  );
}
