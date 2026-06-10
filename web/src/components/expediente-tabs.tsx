"use client";

import { useRef, useState } from "react";
import { MessageCircle, FileText, ExternalLink, UploadCloud, Loader, Link2, Plus } from "lucide-react";
import { agregarDocumentoDriveAction } from "@/app/(app)/expedientes/actions";

const TABS = [
  { id: "actuaciones", label: "Actuaciones" },
  { id: "partes", label: "Partes" },
  { id: "audiencias", label: "Audiencias" },
  { id: "documentos", label: "Documentos" },
  { id: "caja", label: "Caja" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export type ActuacionData = {
  id: string;
  tipo: string | null;
  descripcion: string | null;
  fecha: string;
  registradoPor: string | null;
  origen: string;
};

export type ParteData = {
  id: string;
  nombre: string;
  rol: string | null;
  contacto: string | null;
};

export type AudienciaData = {
  id: string;
  fechaHora: string;
  tipo: string | null;
  lugar: string | null;
  estado: string;
};

export type DocumentoData = {
  id: string;
  nombre: string;
  tipo: string | null;
  linkDrive: string | null;
  fecha: string;
};

export type MovimientoTabData = {
  id: string;
  fecha: string;
  concepto: string | null;
  tipo: string;
  monto: number;
};

export function ExpedienteTabs({
  expedienteId,
  actuaciones,
  partes,
  audiencias,
  documentos: documentosIniciales,
  movimientos,
}: {
  expedienteId: string;
  actuaciones: ActuacionData[];
  partes: ParteData[];
  audiencias: AudienciaData[];
  documentos: DocumentoData[];
  movimientos: MovimientoTabData[];
}) {
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
        {tab === "actuaciones" && <Actuaciones data={actuaciones} />}
        {tab === "partes"      && <Partes data={partes} />}
        {tab === "audiencias"  && <Audiencias data={audiencias} />}
        {tab === "documentos"  && <Documentos expedienteId={expedienteId} inicial={documentosIniciales} />}
        {tab === "caja"        && <Caja data={movimientos} />}
      </div>
    </>
  );
}

function Actuaciones({ data }: { data: ActuacionData[] }) {
  if (!data.length) return <p className="text-muted text-[13.5px]">Sin actuaciones registradas.</p>;
  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-line" />
      {data.map((e, i) => (
        <div key={e.id} className={`relative ${i < data.length - 1 ? "mb-5" : ""}`}>
          <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-paper ${e.origen === "whatsapp" ? "bg-amber" : "bg-navy"}`} />
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-ink">{e.tipo ? capitalize(e.tipo) : "Actuación"}</p>
            {e.origen === "whatsapp" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-success-wash text-success text-[11px] font-bold">
                <MessageCircle size={12} /> WhatsApp
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-muted">
            {e.fecha}
            {e.registradoPor ? ` · ${e.registradoPor}` : ""}
            {e.descripcion ? ` · ${e.descripcion}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function Partes({ data }: { data: ParteData[] }) {
  if (!data.length) return <p className="text-muted text-[13.5px]">Sin partes registradas.</p>;
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
        {data.map((p) => (
          <tr key={p.id}>
            <td className="px-2 py-3 font-bold">{p.nombre}</td>
            <td className="px-2 py-3">{p.rol ? capitalize(p.rol.replace(/_/g, " ")) : "—"}</td>
            <td className="px-2 py-3 num text-muted">{p.contacto ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Audiencias({ data }: { data: AudienciaData[] }) {
  if (!data.length) return <p className="text-muted text-[13.5px]">Sin audiencias registradas.</p>;
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
        {data.map((a) => (
          <tr key={a.id}>
            <td className="px-2 py-3 num">{a.fechaHora}</td>
            <td className="px-2 py-3">{a.tipo ?? "—"}</td>
            <td className="px-2 py-3 text-muted">{a.lugar ?? "—"}</td>
            <td className="px-2 py-3">
              <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${a.estado === "realizada" ? "bg-success-wash text-success" : "bg-navy/[.08] text-navy"}`}>
                {capitalize(a.estado)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Documentos({ expedienteId, inicial }: { expedienteId: string; inicial: DocumentoData[] }) {
  const [docs, setDocs] = useState<(DocumentoData & { subiendo?: boolean })[]>(inicial);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveNombre, setDriveNombre] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [driveGuardando, setDriveGuardando] = useState(false);

  async function manejar(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") { alert("Solo se permiten archivos PDF."); continue; }
      const placeholder = { id: `tmp-${Date.now()}`, nombre: file.name, tipo: "pdf", linkDrive: null, fecha: hoy(), subiendo: true };
      setDocs((prev) => [placeholder, ...prev]);

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/expedientes/${expedienteId}/documentos`, { method: "POST", body: fd });

      if (res.ok) {
        const saved: DocumentoData = await res.json();
        setDocs((prev) => prev.map((d) => (d.id === placeholder.id ? saved : d)));
      } else {
        alert("Error al subir el archivo.");
        setDocs((prev) => prev.filter((d) => d.id !== placeholder.id));
      }
    }
  }

  async function guardarDrive() {
    if (!driveUrl.trim()) return;
    setDriveGuardando(true);
    const saved = await agregarDocumentoDriveAction(
      expedienteId,
      driveNombre.trim() || "Documento de Drive",
      driveUrl.trim(),
    );
    setDocs((prev) => [saved, ...prev]);
    setDriveNombre("");
    setDriveUrl("");
    setDriveOpen(false);
    setDriveGuardando(false);
  }

  return (
    <>
      {/* Upload PDF */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); manejar(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed px-6 py-7 text-center cursor-pointer transition-colors mb-3 ${
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

      {/* Agregar link de Drive */}
      {!driveOpen ? (
        <button
          onClick={() => setDriveOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-line bg-paper/40 text-[13px] text-muted hover:text-navy hover:border-navy/30 transition-colors mb-4"
        >
          <Link2 size={15} strokeWidth={1.75} />
          Agregar link de Google Drive
        </button>
      ) : (
        <div className="rounded-xl border border-navy/20 bg-navy/[.03] p-4 mb-4">
          <p className="eyebrow text-muted mb-3">Agregar documento de Drive</p>
          <div className="space-y-2">
            <input
              value={driveNombre}
              onChange={(e) => setDriveNombre(e.target.value)}
              placeholder="Nombre del documento (opcional)"
              className="w-full px-3 py-2 rounded-lg bg-white border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
            />
            <input
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="URL de Google Drive…"
              className="w-full px-3 py-2 rounded-lg bg-white border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
              autoFocus
            />
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              type="button"
              onClick={() => { setDriveOpen(false); setDriveNombre(""); setDriveUrl(""); }}
              className="px-3 py-1.5 text-[13px] text-muted hover:text-ink transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardarDrive}
              disabled={driveGuardando || !driveUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors disabled:opacity-60"
            >
              <Plus size={14} /> {driveGuardando ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 && <p className="text-center text-muted text-[13.5px] py-4">Sin documentos. Sube el primero o agrega un link de Drive.</p>}

      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${d.subiendo ? "border-navy/30 bg-paper/40" : "border-line hover:border-navy/30"}`}>
            {d.tipo === "drive" ? (
              <Link2 size={18} strokeWidth={1.75} className="text-amber shrink-0" />
            ) : (
              <FileText size={18} strokeWidth={1.75} className="text-navy shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold truncate">{d.nombre}</p>
              <p className="text-[11.5px] text-muted">{d.tipo === "drive" ? "Google Drive" : "PDF"} · {d.fecha}</p>
            </div>
            {d.subiendo ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-amber font-bold shrink-0">
                <Loader size={16} className="animate-spin" /> Subiendo…
              </span>
            ) : d.linkDrive ? (
              <a href={d.linkDrive} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-navy font-bold cursor-pointer shrink-0">
                <ExternalLink size={16} /> Abrir
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

function Caja({ data }: { data: MovimientoTabData[] }) {
  if (!data.length) return <p className="text-muted text-[13.5px]">Sin movimientos registrados.</p>;
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
        {data.map((m) => (
          <tr key={m.id}>
            <td className="px-2 py-3 num">{m.fecha}</td>
            <td className="px-2 py-3">{m.concepto ?? "—"}</td>
            <td className="px-2 py-3">
              <span className={`font-bold ${m.tipo === "ingreso" ? "text-success" : "text-danger"}`}>
                {capitalize(m.tipo)}
              </span>
            </td>
            <td className="px-2 py-3 num text-right font-bold">${m.monto.toLocaleString("es-MX")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function hoy() { return new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }); }
