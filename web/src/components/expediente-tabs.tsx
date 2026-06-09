"use client";

import { useRef, useState } from "react";
import { MessageCircle, FileText, ExternalLink, UploadCloud, Loader, CheckCircle2 } from "lucide-react";

const TABS = [
  { id: "actuaciones", label: "Actuaciones" },
  { id: "partes", label: "Partes" },
  { id: "audiencias", label: "Audiencias" },
  { id: "documentos", label: "Documentos" },
  { id: "caja", label: "Caja" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ExpedienteTabs() {
  const [tab, setTab] = useState<TabId>("actuaciones");

  return (
    <>
      <div className="px-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-[13.5px] border-b-2 transition-colors ${
              tab === t.id ? "text-ink border-amber font-bold" : "text-muted border-transparent hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "actuaciones" && <Actuaciones />}
        {tab === "partes" && <Partes />}
        {tab === "audiencias" && <Audiencias />}
        {tab === "documentos" && <Documentos />}
        {tab === "caja" && <Caja />}
      </div>
    </>
  );
}

function Actuaciones() {
  const eventos = [
    { t: "Expediente creado", d: "02/06/2026 · registrado por Lic. Christian", wa: true, amber: true },
    { t: "Auto admisorio de demanda", d: '03/06/2026 · "Se admite la demanda en la vía ordinaria mercantil…"', wa: false, amber: false },
    { t: "Emplazamiento al demandado", d: "05/06/2026 · diligencia practicada", wa: false, amber: false },
    { t: "Cliente entregó pagarés originales", d: "07/06/2026 · Lic. Christian", wa: true, amber: true },
  ];
  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-line" />
      {eventos.map((e, i) => (
        <div key={i} className={`relative ${i < eventos.length - 1 ? "mb-5" : ""}`}>
          <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-paper ${e.amber ? "bg-amber" : "bg-navy"}`} />
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-ink">{e.t}</p>
            {e.wa && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-success-wash text-success text-[11px] font-bold">
                <MessageCircle size={12} /> WhatsApp
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-muted">{e.d}</p>
        </div>
      ))}
    </div>
  );
}

function Partes() {
  const partes = [
    { nombre: "Juan Pérez", rol: "Actor (cliente)", contacto: "961 123 4567" },
    { nombre: "Comercializadora XYZ SA", rol: "Demandado", contacto: "—" },
    { nombre: "Lic. Roberto Díaz", rol: "Abogado contrario", contacto: "—" },
  ];
  return (
    <table className="w-full text-[13.5px]">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="eyebrow text-muted px-2 py-2.5">Nombre</th>
          <th className="eyebrow text-muted px-2 py-2.5">Rol</th>
          <th className="eyebrow text-muted px-2 py-2.5">Contacto</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/70">
        {partes.map((p, i) => (
          <tr key={i}>
            <td className="px-2 py-3 font-bold">{p.nombre}</td>
            <td className="px-2 py-3">{p.rol}</td>
            <td className="px-2 py-3 num text-muted">{p.contacto}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Audiencias() {
  const aud = [
    { fecha: "09/06/2026 10:00", tipo: "Conciliatoria", lugar: "Juzgado 3.º Civil", estado: "Programada", ok: false },
    { fecha: "21/05/2026 09:00", tipo: "Inicial", lugar: "Juzgado 3.º Civil", estado: "Realizada", ok: true },
  ];
  return (
    <table className="w-full text-[13.5px]">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="eyebrow text-muted px-2 py-2.5">Fecha y hora</th>
          <th className="eyebrow text-muted px-2 py-2.5">Tipo</th>
          <th className="eyebrow text-muted px-2 py-2.5">Lugar</th>
          <th className="eyebrow text-muted px-2 py-2.5">Estado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/70">
        {aud.map((a, i) => (
          <tr key={i}>
            <td className="px-2 py-3 num">{a.fecha}</td>
            <td className="px-2 py-3">{a.tipo}</td>
            <td className="px-2 py-3 text-muted">{a.lugar}</td>
            <td className="px-2 py-3">
              <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${a.ok ? "bg-success-wash text-success" : "bg-navy/[.08] text-navy"}`}>
                {a.estado}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Doc = { nombre: string; meta: string; estado: "guardado" | "subiendo" };

function Documentos() {
  const [docs, setDocs] = useState<Doc[]>([
    { nombre: "Demanda.pdf", meta: "Demanda · 02/06/2026", estado: "guardado" },
    { nombre: "Pagares.pdf", meta: "Prueba documental · 07/06/2026", estado: "guardado" },
    { nombre: "INE_cliente.pdf", meta: "Identificación · 02/06/2026", estado: "guardado" },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function hoy() {
    return new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function manejar(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.type !== "application/pdf") {
        alert("Solo se permiten archivos PDF.");
        return;
      }
      const nuevo: Doc = { nombre: file.name, meta: `Subido ahora · ${hoy()}`, estado: "subiendo" };
      setDocs((prev) => [nuevo, ...prev]);
      // En producción aquí va la subida a Google Drive vía API; al confirmar pasa a "guardado".
      setTimeout(() => {
        setDocs((prev) => prev.map((d) => (d === nuevo ? { ...d, estado: "guardado" } : d)));
      }, 1200);
    });
  }

  return (
    <>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); manejar(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed px-6 py-7 text-center cursor-pointer transition-colors mb-4 ${
          drag ? "border-navy/60 bg-paper" : "border-line bg-paper/40 hover:border-navy/40 hover:bg-paper"
        }`}
      >
        <div className="w-11 h-11 mx-auto rounded-full bg-navy/[.08] flex items-center justify-center text-navy">
          <UploadCloud size={18} strokeWidth={1.75} />
        </div>
        <p className="text-[14px] font-bold text-ink mt-3">
          Arrastra un PDF aquí o <span className="text-navy underline decoration-amber/60 underline-offset-2">haz clic para seleccionar</span>
        </p>
        <p className="text-[12px] text-muted mt-1">Solo archivos PDF · máximo 20 MB</p>
        <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden"
          onChange={(e) => { manejar(e.target.files); e.target.value = ""; }} />
      </div>

      <div className="space-y-2">
        {docs.map((d, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${d.estado === "subiendo" ? "border-navy/30 bg-paper/40" : "border-line hover:border-navy/30"}`}>
            <FileText size={18} strokeWidth={1.75} className="text-navy" />
            <div className="flex-1">
              <p className="text-[13.5px] font-bold">{d.nombre}</p>
              <p className="text-[11.5px] text-muted">{d.meta}</p>
            </div>
            {d.estado === "subiendo" ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-amber font-bold">
                <Loader size={16} className="animate-spin" /> Subiendo…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-navy font-bold cursor-pointer">
                <ExternalLink size={16} /> Abrir en Drive
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Caja() {
  const mov = [
    { fecha: "02/06/2026", concepto: "Anticipo de honorarios", tipo: "Ingreso", monto: "$8,000", ingreso: true },
    { fecha: "05/06/2026", concepto: "Gastos de emplazamiento", tipo: "Egreso", monto: "$650", ingreso: false },
  ];
  return (
    <table className="w-full text-[13.5px]">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="eyebrow text-muted px-2 py-2.5">Fecha</th>
          <th className="eyebrow text-muted px-2 py-2.5">Concepto</th>
          <th className="eyebrow text-muted px-2 py-2.5">Tipo</th>
          <th className="eyebrow text-muted px-2 py-2.5 text-right">Monto</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line/70">
        {mov.map((m, i) => (
          <tr key={i}>
            <td className="px-2 py-3 num">{m.fecha}</td>
            <td className="px-2 py-3">{m.concepto}</td>
            <td className="px-2 py-3"><span className={`font-bold ${m.ingreso ? "text-success" : "text-danger"}`}>{m.tipo}</span></td>
            <td className="px-2 py-3 num text-right font-bold">{m.monto}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
