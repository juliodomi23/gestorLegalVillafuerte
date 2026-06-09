"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = "Guardar",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[8vh] overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-line shadow-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="font-serif text-[19px] text-ink">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="px-6 py-5 grid grid-cols-2 gap-4">{children}</div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-line">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-line text-[13px] hover:border-navy/40 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelCls = "eyebrow text-muted block mb-1.5";
const fieldCls =
  "w-full px-3 py-2 rounded-lg bg-surface border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition";

export function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "col-span-2" : ""}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={fieldCls} />;
}

export function Select({ options, ...props }: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={fieldCls}>
      <option value="">Seleccionar…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
