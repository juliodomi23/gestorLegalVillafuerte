"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Rol } from "@/lib/usuarios";

const KEY = "gl-tour-v1";
const ANCHO = 320;

type Paso = {
  /** Ruta a la que se navega antes de mostrar el paso. */
  ruta?: string;
  sel?: string;
  titulo: string;
  texto: string;
  soloAdmin?: boolean;
};

const PASOS: Paso[] = [
  {
    ruta: "/inicio",
    titulo: "Bienvenido al Gestor Legal",
    texto:
      "Aquí vive todo el despacho: expedientes, agenda, asesorías y cobros. Te llevo por cada pantalla en un minuto.",
  },
  {
    ruta: "/inicio",
    sel: '[data-tour="kpis"]',
    titulo: "Tu tablero de inicio",
    texto:
      "El resumen del día: qué traes activo, qué se cobró y qué está por vencer. Da clic en cualquier número para ver el detalle.",
  },
  {
    ruta: "/expedientes",
    sel: '[data-tour="titulo"]',
    titulo: "Expedientes",
    texto:
      "El corazón del sistema. Cada asunto lleva su número interno, el judicial, la materia, el juzgado y la etapa procesal.",
  },
  {
    ruta: "/expedientes",
    sel: '[data-tour="nuevo"]',
    titulo: "Abrir un expediente",
    texto:
      "El botón que más vas a usar. Adentro del expediente cuelgas audiencias, pagos y documentos escaneados.",
  },
  {
    ruta: "/agenda",
    sel: '[data-tour="titulo"]',
    titulo: "Agenda",
    texto:
      "Citas y audiencias de las cinco sucursales. Lo que agenda el bot de WhatsApp cae aquí solo, sin capturar nada.",
  },
  {
    ruta: "/asesorias",
    sel: '[data-tour="titulo"]',
    titulo: "Asesorías digitales",
    texto:
      "Se acabó la libreta. Cada asesoría queda agrupada por día y sucursal, con su folio consecutivo, quién la atendió, si pagó y en qué acabó.",
  },
  {
    ruta: "/asesorias",
    sel: '[data-tour="asesorias-nueva"]',
    titulo: "Adiós a las hojas de papel",
    texto:
      "Ustedes mismos capturan la asesoría aquí: datos del cliente, asunto, si pagó y el presupuesto. Ya no hace falta llenar la hoja a mano ni archivarla.",
  },
  {
    ruta: "/asesorias",
    sel: '[data-tour="asesorias-digital"]',
    titulo: "…o deja que el bot la llene",
    texto:
      "Si prefieres mandar la foto o el PDF de la hoja por WhatsApp, el bot crea la asesoría solo y guarda el documento en Drive. Lo abres con el botón de cada fila.",
  },
  {
    ruta: "/clientes",
    sel: '[data-tour="titulo"]',
    titulo: "Clientes y prospectos",
    texto:
      "Con expediente abierto son Clientes; los que apenas preguntaron viven en Prospectos hasta que firman.",
  },
  {
    ruta: "/seguimientos",
    sel: '[data-tour="titulo"]',
    titulo: "Seguimientos",
    texto:
      "La lista de a quién hay que llamar y cuándo. El sistema te recuerda el próximo contacto según la frecuencia que fijes.",
  },
  {
    ruta: "/caja",
    sel: '[data-tour="titulo"]',
    soloAdmin: true,
    titulo: "Caja",
    texto:
      "Ingresos, egresos y corte del día por sucursal. Los pagos de asesoría entran solos. Solo lo ven los administradores.",
  },
  {
    sel: '[data-tour="buscar"]',
    titulo: "Busca sin dar clics",
    texto:
      "Escribe el nombre del cliente o el número de expediente. Con ⌘K (o Ctrl+K) llegas aquí desde cualquier pantalla.",
  },
  {
    ruta: "/inicio",
    titulo: "Listo, es tuyo",
    texto:
      "Eso es todo. Si quieres repetir el recorrido, usa el signo de interrogación abajo a la izquierda, junto a tu nombre.",
  },
];

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

type R = { left: number; top: number; width: number; height: number };

const igual = (a: R | null, b: R | null) =>
  a === b || (!!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);

/**
 * Acerca un rect a su destino. Sustituye a `transition` de CSS: como el objetivo
 * se re-mide en cada frame (scroll, cambio de pantalla), una transición CSS se
 * reiniciaría constantemente y el hueco nunca llegaría.
 *
 * El avance va por tiempo transcurrido, no por frame: Chrome frena el rAF de las
 * ventanas en segundo plano y si no, la animación se quedaría a medias.
 */
function acercar(a: R | null, b: R | null, dt: number): R | null {
  if (!b) return null;
  if (!a) return b;
  const k = 1 - Math.exp(-dt * 9); // ~0.4 s hasta asentarse
  const n = {
    left: a.left + (b.left - a.left) * k,
    top: a.top + (b.top - a.top) * k,
    width: a.width + (b.width - a.width) * k,
    height: a.height + (b.height - a.height) * k,
  };
  const falta =
    Math.abs(n.left - b.left) + Math.abs(n.top - b.top) + Math.abs(n.width - b.width) + Math.abs(n.height - b.height);
  return falta < 1 ? b : n; // encaja al final para dejar de renderizar
}

/** El rect solo sirve si el elemento existe y está visible dentro del viewport. */
function rectVisible(sel?: string): DOMRect | null {
  if (!sel) return null;
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // ponytail: en móvil el sidebar existe pero está fuera de pantalla → paso centrado.
  // Si algún día molesta, abrir el drawer antes de medir.
  if (r.width === 0 || r.right <= 0 || r.left >= window.innerWidth) return null;
  return r;
}

type Zona = { left: number; top: number; width: number; height: number };

/**
 * Oscurece una zona de la pantalla recortando un hueco. El hueco lo hace el
 * box-shadow gigante de .tour-spot; el overflow del panel evita que la sombra
 * invada las zonas vecinas, que es lo que permite tener varios huecos.
 */
function Panel({ zona, hueco }: { zona: Zona; hueco: R | null }) {
  return (
    <div className="fixed overflow-hidden pointer-events-none" style={zona}>
      {hueco ? (
        <div
          className="tour-spot absolute rounded-xl"
          style={{
            left: hueco.left - zona.left - 6,
            top: hueco.top - zona.top - 6,
            width: hueco.width + 12,
            height: hueco.height + 12,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-ink/60 tour-fade" />
      )}
    </div>
  );
}

export function Tour({ rol }: { rol: Rol }) {
  const pasos = PASOS.filter((p) => !p.soloAdmin || rol === "admin");
  const router = useRouter();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [i, setI] = useState(0);
  // `rect` es el hueco que se pinta (va persiguiendo a `destino`); `destino` es
  // la medida real del objetivo y es lo que coloca la tarjeta, para que no vaya
  // desplazándose junto con la animación.
  const [rect, setRect] = useState<R | null>(null);
  const [destino, setDestino] = useState<R | null>(null);
  const destinoRef = useRef<R | null>(null);
  // Sidebar: el ítem del menú de la pantalla actual + el ancho de la barra.
  const [nav, setNav] = useState<{ item: R; ancho: number } | null>(null);

  const paso = pasos[i];

  // Primera visita + evento para relanzarlo desde el sidebar
  useEffect(() => {
    if (!localStorage.getItem(KEY)) setAbierto(true);
    const abrir = () => {
      setI(0);
      setAbierto(true);
    };
    window.addEventListener("gl:tour", abrir);
    return () => window.removeEventListener("gl:tour", abrir);
  }, []);

  // Navegar a la pantalla del paso actual
  useEffect(() => {
    if (!abierto || !paso?.ruta || pathname === paso.ruta) return;
    router.push(paso.ruta);
  }, [abierto, paso?.ruta, pathname, router]);

  // Medir los objetivos en cada frame mientras el tour está abierto.
  // ponytail: un rAF sale más barato y más fiable que sondeos + listeners de
  // scroll/resize — el sidebar es `lg:static`, así que se mueve con la página
  // y cualquier medición cacheada se desincroniza. Solo hay setState cuando el
  // rect cambia de verdad, así que no provoca renders por frame.
  useEffect(() => {
    if (!abierto) return;
    let raf = 0;
    let yaScroll = false;

    let previo = performance.now();

    const tick = (ahora: number) => {
      const dt = Math.min((ahora - previo) / 1000, 0.25);
      previo = ahora;
      const r = rectVisible(paso?.sel);
      if (r && !yaScroll) {
        yaScroll = true;
        document.querySelector(paso!.sel!)?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      // Si el paso tiene objetivo pero la pantalla nueva aún no lo pinta, se
      // conserva el destino anterior para que el hueco se deslice hasta él.
      const meta = !r && paso?.sel ? destinoRef.current : r;
      destinoRef.current = meta;
      setDestino((prev) => (igual(prev, meta) ? prev : meta));
      setRect((prev) => {
        const n = acercar(prev, meta, dt);
        return igual(prev, n) ? prev : n;
      });

      const aside = document.querySelector("aside")?.getBoundingClientRect();
      const item = rectVisible(`[data-tour="nav-${pathname.split("/")[1]}"]`);
      // En móvil la barra está fuera de pantalla: sin hueco lateral.
      const ancho = item && aside && aside.right > 0 ? aside.right : 0;
      setNav((prev) => {
        if (!ancho) return prev === null ? prev : null;
        const n = acercar(prev?.item ?? null, item, dt)!;
        return prev && prev.ancho === ancho && igual(prev.item, n) ? prev : { item: n, ancho };
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [abierto, i, paso?.sel, pathname]);

  const cerrar = useCallback(() => {
    localStorage.setItem(KEY, "1");
    setAbierto(false);
  }, []);

  const siguiente = useCallback(() => {
    if (i + 1 >= pasos.length) cerrar();
    else setI(i + 1);
  }, [i, pasos.length, cerrar]);

  // Teclado: Esc cierra, →/Enter avanza, ← retrocede
  useEffect(() => {
    if (!abierto) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight" || e.key === "Enter") siguiente();
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [abierto, cerrar, siguiente]);

  if (!abierto || !paso) return null;

  // ponytail: 240px es la altura estimada del tooltip; basta para elegir arriba/abajo.
  const ALTO = 240;
  const pad = 14;
  let estilo: React.CSSProperties;
  if (!destino) {
    estilo = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  } else if (destino.width > window.innerWidth * 0.55) {
    // Objetivo de ancho completo: la tarjeta se va a una esquina para no tapar el contenido.
    const arriba = destino.top < window.innerHeight / 2;
    estilo = {
      left: window.innerWidth - ANCHO - 24,
      top: arriba ? window.innerHeight - ALTO - 24 : 24,
    };
  } else if (window.innerWidth - (destino.left + destino.width) > ANCHO + 40) {
    estilo = {
      left: destino.left + destino.width + pad,
      top: clamp(destino.top - 8, 16, window.innerHeight - ALTO - 16),
    };
  } else {
    const abajo = destino.top + destino.height + pad;
    estilo = {
      left: clamp(destino.left, 16, window.innerWidth - ANCHO - 16),
      top: abajo + ALTO < window.innerHeight ? abajo : Math.max(16, destino.top - ALTO - pad),
    };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Recorrido guiado">
      {/* Dos zonas independientes para poder abrir dos huecos a la vez:
          la barra lateral (ítem del menú actual) y el resto de la pantalla. */}
      {nav && (
        <Panel zona={{ left: 0, top: 0, width: nav.ancho, height: window.innerHeight }} hueco={nav.item} />
      )}
      <Panel
        zona={{
          left: nav?.ancho ?? 0,
          top: 0,
          width: window.innerWidth - (nav?.ancho ?? 0),
          height: window.innerHeight,
        }}
        hueco={rect}
      />

      {/* Clics fuera del tooltip no hacen nada (evita perderse a media guía) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <div
        key={i}
        style={{ ...estilo, width: ANCHO }}
        className="tour-card fixed bg-surface rounded-xl shadow-xl border border-line p-5"
      >
        <button
          onClick={cerrar}
          aria-label="Cerrar recorrido"
          className="absolute top-3 right-3 text-muted hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>

        <p className="eyebrow text-amber mb-2">
          Paso {i + 1} de {pasos.length}
        </p>
        <h3 className="font-serif text-[19px] leading-tight text-ink mb-2">{paso.titulo}</h3>
        <p className="text-[13.5px] text-muted leading-relaxed">{paso.texto}</p>

        <div className="flex items-center gap-3 mt-5">
          <div className="flex gap-1.5 flex-1">
            {pasos.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  n === i ? "w-5 bg-amber" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </div>
          <button
            onClick={i > 0 ? () => setI(i - 1) : cerrar}
            className="text-[13px] text-muted hover:text-ink transition-colors"
          >
            {i > 0 ? "Atrás" : "Saltar"}
          </button>
          <button
            onClick={siguiente}
            className="px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors shadow-sm"
          >
            {i + 1 === pasos.length ? "Empezar" : "Siguiente"}
          </button>
        </div>

      </div>
    </div>
  );
}
