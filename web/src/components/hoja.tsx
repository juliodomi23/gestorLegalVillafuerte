"use client";

import { useEffect } from "react";
import { X, Printer } from "lucide-react";

/**
 * Hoja tamaño carta a pantalla completa: reemplaza al modal cuando el formulario
 * imita un documento de papel. Los campos son de línea (ver Campo/Sel/Area).
 */
export function Hoja({
  open,
  onClose,
  onSubmit,
  submitLabel,
  titulo,
  folio,
  fecha,
  sucursal,
  pie,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  titulo: string;
  /** Folio ya asignado; si no hay, se muestra que se asigna al guardar. */
  folio?: string | null;
  fecha: string;
  sucursal?: string;
  /** Texto al pie, junto a la firma (p. ej. quién atendió). */
  pie?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm overflow-y-auto py-6 px-4 hoja-fondo">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        // 816px = ancho de una carta a 96 dpi
        className="hoja relative mx-auto bg-white shadow-2xl rounded-sm w-full max-w-[816px] px-10 py-9 sm:px-14 sm:py-12"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="no-imprimir absolute right-6 top-6 sm:right-10 sm:top-10 text-muted hover:text-ink transition-colors"
        >
          <X size={20} />
        </button>

        <header className="flex items-start gap-4 pb-5 border-b-2 border-navy">
          <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-navy-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[17px] leading-tight text-ink">Villafuerte y Asociados</p>
            <p className="text-[11px] text-muted tracking-wide">Bufete Jurídico</p>
            <p className="eyebrow text-navy mt-2.5">{titulo}</p>
            <p className="text-[12px] text-muted mt-0.5">
              {sucursal ? `${sucursal} · ` : ""}
              {fecha}
            </p>
          </div>
          <div className="border border-navy/30 rounded px-4 py-2 text-center shrink-0">
            <p className="eyebrow text-muted text-[9px]">Folio</p>
            {folio ? (
              <p className="exp-no text-[17px] text-navy font-bold leading-tight mt-0.5">{folio}</p>
            ) : (
              <p className="text-[10px] text-muted leading-tight mt-1 max-w-[86px]">Se asigna al guardar</p>
            )}
          </div>
        </header>

        <div className="grid grid-cols-12 gap-x-6 gap-y-4 pt-7">{children}</div>

        <footer className="mt-10 pt-5 border-t border-line flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px] text-[12px] text-muted">{pie}</div>
          <div className="no-imprimir flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-line text-[13px] hover:border-navy/40 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line text-[13px] hover:border-navy/40 transition-colors"
            >
              <Printer size={15} strokeWidth={1.75} /> Imprimir
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors"
            >
              {submitLabel}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

// Tailwind no genera clases construidas al vuelo, hay que nombrarlas enteras.
const COL: Record<number, string> = {
  2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 5: "sm:col-span-5",
  6: "sm:col-span-6", 7: "sm:col-span-7", 8: "sm:col-span-8", 9: "sm:col-span-9", 12: "sm:col-span-12",
};

const linea =
  "w-full bg-transparent border-b border-line py-1.5 text-[14px] text-ink outline-none transition-colors focus:border-navy placeholder:text-muted/45";

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow text-muted/70 text-[9.5px] block mb-0.5">{children}</span>;
}

/** col: columnas de 12 que ocupa el campo. */
export function Campo({
  label,
  col = 4,
  value,
  onChange,
  ...props
}: {
  label: string;
  col?: number;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className={`col-span-12 ${COL[col]} block`}>
      <Etiqueta>{label}</Etiqueta>
      <input {...props} value={value} onChange={(e) => onChange(e.target.value)} className={linea} />
    </label>
  );
}

export function Sel({
  label,
  col = 4,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  col?: number;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  /** La opción vacía tiene value="", así que el `required` nativo basta: el
   *  navegador bloquea el submit sin JS extra. */
  required?: boolean;
}) {
  return (
    <label className={`col-span-12 ${COL[col]} block`}>
      <Etiqueta>{label}</Etiqueta>
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className={`${linea} cursor-pointer`}>
        <option value="" />
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Area({
  label,
  col = 12,
  rows = 3,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  col?: number;
  rows?: number;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={`col-span-12 ${COL[col]} block`}>
      <Etiqueta>{label}</Etiqueta>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${linea} resize-none leading-relaxed`}
      />
    </label>
  );
}

/** Título de sección con línea, para separar bloques de la hoja. */
export function Seccion({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-12 eyebrow text-navy border-b border-line/70 pb-1.5 mt-3 first:mt-0">{children}</p>
  );
}

/** Par de casillas tipo formulario impreso (Sí / No). */
export function Casillas({
  label,
  col = 4,
  value,
  onChange,
  options,
}: {
  label: string;
  col?: number;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className={`col-span-12 ${COL[col]}`}>
      <Etiqueta>{label}</Etiqueta>
      <div className="flex gap-2 pt-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`px-4 py-1.5 rounded border text-[13px] transition-colors ${
              value === o
                ? "border-navy bg-navy text-white font-bold"
                : "border-line text-muted hover:border-navy/40"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
