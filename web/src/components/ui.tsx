import { ChevronDown, MessageCircle, Search } from "lucide-react";

export function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <p className="eyebrow text-amber">{eyebrow}</p>
      <h1 className="font-serif text-[28px] text-ink leading-tight mt-1">{title}</h1>
      {subtitle && <p className="text-muted text-[14px] mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-xl border border-line shadow-card ${className}`}>{children}</div>;
}

export function FilterButton({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors">
      {label} <ChevronDown size={16} className="text-muted" />
    </button>
  );
}

// Filtro funcional: <select> estilizado. value "" = todos.
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const activo = value !== "";
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 rounded-lg border text-[13px] cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-navy/20 ${
        activo ? "border-navy/40 bg-navy/[.04] text-navy font-bold" : "border-line bg-surface text-ink hover:border-navy/40"
      }`}
    >
      <option value="">{label}: todos</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {label}: {o}
        </option>
      ))}
    </select>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-3 py-2 rounded-lg border border-line bg-surface text-[13px] w-64 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
      />
    </div>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  const activo = estado === "Activo";
  const color = activo ? "text-success bg-success" : "text-muted bg-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-bold ${color.split(" ")[0]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color.split(" ")[1]}`} /> {estado}
    </span>
  );
}

export function MateriaTag({ materia }: { materia: string }) {
  return <span className="px-2 py-0.5 rounded bg-navy/[.08] text-navy text-[12px] font-bold">{materia}</span>;
}

export function Vencimiento({ texto, urgente }: { texto: string | null; urgente: boolean }) {
  if (!texto) return <span className="text-muted">—</span>;
  return (
    <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${urgente ? "bg-danger-wash text-danger" : "text-muted"}`}>
      {texto}
    </span>
  );
}

export function OrigenChip({ origen }: { origen: "WhatsApp" | "Web" }) {
  if (origen === "WhatsApp")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-success-wash text-success text-[11.5px] font-bold">
        <MessageCircle size={12} /> WhatsApp
      </span>
    );
  return <span className="px-2 py-0.5 rounded bg-line/60 text-muted text-[11.5px] font-bold">Web</span>;
}
