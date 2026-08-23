"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, Menu, FileText, User, X, AlertTriangle } from "lucide-react";

type Resultado = {
  tipo: "expediente" | "prospecto";
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
};

function SearchDropdown({
  resultados,
  cargando,
  query,
  navegar,
}: {
  resultados: Resultado[];
  cargando: boolean;
  query: string;
  navegar: (href: string) => void;
}) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-line rounded-xl shadow-xl overflow-hidden z-50">
      {cargando && <p className="px-4 py-3 text-[13px] text-muted">Buscando…</p>}
      {!cargando && resultados.length === 0 && (
        <p className="px-4 py-3 text-[13px] text-muted">
          Sin resultados para &ldquo;{query}&rdquo;
        </p>
      )}
      {resultados.map((r) => (
        <button
          key={`${r.tipo}-${r.id}`}
          onMouseDown={() => navegar(r.href)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-paper transition-colors border-b border-line/50 last:border-0"
        >
          <span
            className={`shrink-0 p-1.5 rounded-md ${
              r.tipo === "expediente" ? "bg-navy/[.08] text-navy" : "bg-amber-wash text-amber"
            }`}
          >
            {r.tipo === "expediente" ? <FileText size={14} /> : <User size={14} />}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-ink truncate">{r.titulo}</p>
            <p className="text-[12px] text-muted truncate">{r.subtitulo}</p>
          </div>
          <span className="shrink-0 ml-auto text-[11px] text-muted/60 font-medium">
            {r.tipo === "expediente" ? "Expediente" : "Prospecto"}
          </span>
        </button>
      ))}
    </div>
  );
}

type Alerta = {
  id: string;
  severidad: "critica" | "alta" | "media" | "info";
  titulo: string;
  detalle: string;
  href: string;
};

const COLOR_SEVERIDAD: Record<string, string> = {
  critica: "text-danger",
  alta: "text-amber",
  media: "text-navy",
  info: "text-muted",
};

// Cada 2 minutos: son avisos de expedientes y asistencia, no un chat. Consultar más
// seguido sólo gasta base de datos.
const REFRESCO_ALERTAS_MS = 120_000;

function Campana() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/alertas");
        if (!res.ok) return;
        const d = await res.json();
        if (vivo) setAlertas(d.alertas ?? []);
      } catch {
        // sin conexión: se reintenta en el siguiente ciclo
      }
    };
    cargar();
    const id = setInterval(cargar, REFRESCO_ALERTAS_MS);
    document.addEventListener("visibilitychange", cargar);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", cargar);
    };
  }, []);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const criticas = alertas.filter((a) => a.severidad === "critica").length;

  return (
    <div ref={ref} className="relative">
      {/* Sin caja ni borde: con ellos competía con "Nuevo expediente", que es la
          acción principal. Un icono con hover basta, y el badge hace el trabajo de
          llamar la atención sólo cuando hay algo. */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`relative p-2.5 rounded-xl transition-colors ${
          abierto ? "bg-line/60 text-ink" : "text-muted hover:text-ink hover:bg-line/50"
        }`}
        title={alertas.length ? `${alertas.length} alerta${alertas.length !== 1 ? "s" : ""}` : "Sin alertas"}
        aria-label={alertas.length ? `${alertas.length} alertas` : "Sin alertas"}
      >
        <Bell size={19} strokeWidth={1.75} />
        {alertas.length > 0 && (
          <span
            className={`absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[10.5px] font-bold text-white grid place-items-center ring-2 ring-paper ${
              criticas > 0 ? "bg-danger" : "bg-amber"
            }`}
          >
            {alertas.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-line bg-paper/60 flex items-center justify-between gap-3">
            <p className="text-[13.5px] font-bold text-ink">
              {alertas.length > 0 ? `${alertas.length} alerta${alertas.length !== 1 ? "s" : ""}` : "Sin alertas"}
            </p>
            {criticas > 0 && (
              <span className="text-[11px] font-bold text-danger bg-danger-wash px-2 py-0.5 rounded">
                {criticas} urgente{criticas !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {alertas.length === 0 ? (
            <p className="px-4 py-8 text-[13px] text-muted text-center">
              Nada pendiente por ahora.
            </p>
          ) : (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-line/60">
              {alertas.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAbierto(false);
                    router.push(a.href);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-paper transition-colors flex gap-2.5"
                >
                  <AlertTriangle
                    size={14}
                    className={`shrink-0 mt-0.5 ${COLOR_SEVERIDAD[a.severidad] ?? "text-muted"}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink">{a.titulo}</span>
                    <span className="block text-[12.5px] text-muted">{a.detalle}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// El despacho trabaja en Windows; mostrar ⌘K ahí no le dice nada a nadie.
function useAtajo() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);
  return mac ? "⌘K" : "Ctrl K";
}

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const router = useRouter();
  const atajo = useAtajo();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setAbierto(true);
      }
      if (e.key === "Escape") {
        setAbierto(false);
        setMobileSearchOpen(false);
        inputRef.current?.blur();
        mobileInputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const outsideDesktop = !containerRef.current?.contains(target);
      const outsideMobile = !mobileContainerRef.current?.contains(target);
      if (outsideDesktop && outsideMobile) {
        setAbierto(false);
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Búsqueda con debounce 250 ms
  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setCargando(true);
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(query.trim())}`, {
          signal: abortRef.current.signal,
        });
        if (res.ok) setResultados(await res.json());
      } catch {
        // fetch abortado, ignorar
      }
      setCargando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Enfocar input móvil al abrir
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 50);
    }
  }, [mobileSearchOpen]);

  function navegar(href: string) {
    setAbierto(false);
    setMobileSearchOpen(false);
    setQuery("");
    setResultados([]);
    router.push(href);
  }

  function limpiarQuery() {
    setQuery("");
    setResultados([]);
  }

  const mostrarDropdown = abierto && query.trim().length >= 2;

  return (
    <header className="bg-paper/80 backdrop-blur border-b border-line sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <button
          onClick={onMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-ink hover:bg-line/50 transition-colors"
          title="Menú"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        {/* Búsqueda: ocupa el ancho que sobra hasta un límite legible. Antes estaba
            topada en max-w-md sin nada que empujara las acciones a la derecha, y por
            eso los botones quedaban flotando a media barra. */}
        <div ref={containerRef} data-tour="buscar" className="relative flex-1 max-w-2xl hidden sm:block">
          <Search size={18} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
            placeholder="Buscar expediente, cliente, prospecto…"
            className="w-full pl-11 pr-20 py-2.5 rounded-xl bg-surface border border-line text-[14px] placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
          />

          {/* El atajo como chip: en el placeholder se cortaba al escribir. */}
          {!query && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block px-1.5 py-0.5 rounded border border-line bg-paper text-[11px] font-medium text-muted/80 pointer-events-none">
              {atajo}
            </kbd>
          )}
          {query && (
            <button
              onClick={limpiarQuery}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-ink hover:bg-line/50 transition-colors"
            >
              <X size={15} />
            </button>
          )}
          {mostrarDropdown && (
            <SearchDropdown
              resultados={resultados}
              cargando={cargando}
              query={query}
              navegar={navegar}
            />
          )}
        </div>

        {/* Acciones, siempre pegadas a la derecha */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="sm:hidden p-2 rounded-lg text-ink hover:bg-line/50 transition-colors"
            title="Buscar"
            aria-label="Buscar"
          >
            {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          <Campana />

          {/* Separador: distingue lo que informa de lo que crea algo. */}
          <span className="hidden sm:block w-px h-6 bg-line mx-1.5" aria-hidden="true" />

          <Link
            href="/expedientes"
            data-tour="nuevo"
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-navy text-white text-[13.5px] font-bold hover:bg-navy-deep transition-colors shadow-sm"
          >
            <Plus size={18} strokeWidth={2} /> <span className="hidden sm:inline">Nuevo expediente</span>
          </Link>
        </div>
      </div>

      {/* Búsqueda móvil expandible */}
      {mobileSearchOpen && (
        <div ref={mobileContainerRef} className="sm:hidden px-4 pb-3 relative">
          <Search size={16} strokeWidth={1.75} className="absolute left-7 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            ref={mobileInputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
            placeholder="Buscar expediente o cliente…"
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface border border-line text-[13.5px] placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
          />
          {query && (
            <button
              onClick={limpiarQuery}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
            >
              <X size={14} />
            </button>
          )}
          {mostrarDropdown && (
            <SearchDropdown
              resultados={resultados}
              cargando={cargando}
              query={query}
              navegar={navegar}
            />
          )}
        </div>
      )}

      <div className="h-px bg-gradient-to-r from-amber/60 via-amber/20 to-transparent" />
    </header>
  );
}
