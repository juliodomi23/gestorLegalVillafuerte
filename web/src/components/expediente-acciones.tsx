"use client";

import { useRef, useState } from "react";
import { Pencil, Plus, FileText, Link2, X } from "lucide-react";
import { Modal, Field, Input, Select } from "@/components/modal";
import { editarExpedienteAction, crearActuacionAction, agregarDocumentoDriveAction, type FormExpediente } from "@/app/(app)/expedientes/actions";
import { MATERIAS, ETAPAS } from "@/lib/constants";

const TIPOS_ACTUACION = ["promocion", "acuerdo", "notificacion", "audiencia", "nota"];

type Props = {
  expedienteId: string;
  usuarioId: string;
  esAdmin: boolean;
  // valores actuales para pre-llenar el form de edición
  inicial: {
    clienteId: string;
    clienteNombre: string;
    numeroJudicial: string;
    materia: string;
    etapa: string;
    abogado: string;
    sucursal: string;
  };
  sucursales: string[];
  abogados: string[];
};

export function ExpedienteAcciones({ expedienteId, usuarioId, esAdmin, inicial, sucursales, abogados }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [editForm, setEditForm] = useState<FormExpediente>(inicial);
  const [actForm, setActForm] = useState({ tipo: "", descripcion: "", fecha: hoy() });
  const [saving, setSaving] = useState(false);
  const [docMode, setDocMode] = useState<"ninguno" | "pdf" | "drive">("ninguno");
  const [driveNombre, setDriveNombre] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function setE(k: keyof FormExpediente, v: string) {
    setEditForm((f) => ({ ...f, [k]: v }));
  }

  async function guardarEdicion() {
    setSaving(true);
    await editarExpedienteAction(expedienteId, editForm);
    setSaving(false);
    setEditOpen(false);
  }

  async function guardarActuacion() {
    setSaving(true);
    const { id: actuacionId } = await crearActuacionAction(expedienteId, usuarioId, actForm);

    if (docMode === "drive" && driveUrl.trim()) {
      await agregarDocumentoDriveAction(
        expedienteId,
        driveNombre.trim() || "Documento de Drive",
        driveUrl.trim(),
        actuacionId,
      );
    } else if (docMode === "pdf" && archivoSeleccionado) {
      const fd = new FormData();
      fd.append("file", archivoSeleccionado);
      fd.append("actuacionId", actuacionId);
      await fetch(`/api/expedientes/${expedienteId}/documentos`, { method: "POST", body: fd });
    }

    setSaving(false);
    setActOpen(false);
    setActForm({ tipo: "", descripcion: "", fecha: hoy() });
    setDocMode("ninguno");
    setDriveNombre("");
    setDriveUrl("");
    setArchivoSeleccionado(null);
  }

  function cerrarActModal() {
    setActOpen(false);
    setActForm({ tipo: "", descripcion: "", fecha: hoy() });
    setDocMode("ninguno");
    setDriveNombre("");
    setDriveUrl("");
    setArchivoSeleccionado(null);
  }

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line bg-surface text-[13px] hover:border-navy/40 transition-colors"
      >
        <Pencil size={18} strokeWidth={1.75} /> Editar
      </button>

      <button
        onClick={() => setActOpen(true)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy-deep transition-colors"
      >
        <Plus size={18} strokeWidth={1.75} /> Actuación
      </button>

      {/* Modal editar expediente */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar expediente" onSubmit={guardarEdicion} submitLabel={saving ? "Guardando…" : "Guardar cambios"}>
        <Field label="N.º de juicio">
          <Input value={editForm.numeroJudicial} onChange={(e) => setE("numeroJudicial", e.target.value)} placeholder="542/2026" />
        </Field>
        <Field label="Materia">
          <Select options={MATERIAS} value={editForm.materia} onChange={(e) => setE("materia", e.target.value)} />
        </Field>
        <Field label="Etapa procesal">
          <Select options={ETAPAS} value={editForm.etapa} onChange={(e) => setE("etapa", e.target.value)} />
        </Field>
        {esAdmin && (
          <Field label="Abogado responsable">
            <Select options={abogados} value={editForm.abogado} onChange={(e) => setE("abogado", e.target.value)} />
          </Field>
        )}
        <Field label="Sucursal">
          <Select options={sucursales} value={editForm.sucursal} onChange={(e) => setE("sucursal", e.target.value)} />
        </Field>
      </Modal>

      {/* Modal nueva actuación */}
      <Modal open={actOpen} onClose={cerrarActModal} title="Nueva actuación" onSubmit={guardarActuacion} submitLabel={saving ? "Guardando…" : "Registrar"}>
        <Field label="Tipo">
          <Select
            options={TIPOS_ACTUACION}
            value={actForm.tipo}
            onChange={(e) => setActForm((f) => ({ ...f, tipo: e.target.value }))}
          />
        </Field>
        <Field label="Fecha">
          <Input
            type="date"
            value={actForm.fecha}
            onChange={(e) => setActForm((f) => ({ ...f, fecha: e.target.value }))}
          />
        </Field>
        <Field label="Descripción" full>
          <textarea
            value={actForm.descripcion}
            onChange={(e) => setActForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Describe la actuación…"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition resize-none"
          />
        </Field>

        {/* Adjuntar documento */}
        <div className="col-span-2 border-t border-line pt-4">
          <p className="eyebrow text-muted mb-3">Adjuntar documento (opcional)</p>
          {docMode === "ninguno" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDocMode("pdf")}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line bg-paper/40 text-[13px] text-muted hover:text-navy hover:border-navy/30 transition-colors"
              >
                <FileText size={15} strokeWidth={1.75} /> Subir PDF
              </button>
              <button
                type="button"
                onClick={() => setDocMode("drive")}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line bg-paper/40 text-[13px] text-muted hover:text-navy hover:border-navy/30 transition-colors"
              >
                <Link2 size={15} strokeWidth={1.75} /> Link de Drive
              </button>
            </div>
          )}

          {docMode === "pdf" && (
            <div className="flex items-center gap-3">
              {archivoSeleccionado ? (
                <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border border-navy/30 bg-navy/[.04] text-[13px]">
                  <FileText size={15} className="text-navy shrink-0" />
                  <span className="truncate text-ink font-bold">{archivoSeleccionado.name}</span>
                  <button type="button" onClick={() => setArchivoSeleccionado(null)} className="ml-auto text-muted hover:text-ink">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 px-3 py-2 rounded-lg border border-dashed border-navy/30 bg-paper/40 text-[13px] text-muted hover:border-navy/50 hover:text-navy transition-colors text-center"
                >
                  Seleccionar PDF…
                </button>
              )}
              <button type="button" onClick={() => { setDocMode("ninguno"); setArchivoSeleccionado(null); }} className="text-muted hover:text-ink text-[12px]">
                Cancelar
              </button>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { setArchivoSeleccionado(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            </div>
          )}

          {docMode === "drive" && (
            <div className="space-y-2">
              <input
                value={driveNombre}
                onChange={(e) => setDriveNombre(e.target.value)}
                placeholder="Nombre del documento (opcional)"
                className="w-full px-3 py-2 rounded-lg bg-white border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
              />
              <div className="flex gap-2">
                <input
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="URL de Google Drive…"
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-lg bg-white border border-line text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
                />
                <button type="button" onClick={() => { setDocMode("ninguno"); setDriveNombre(""); setDriveUrl(""); }} className="text-muted hover:text-ink text-[12px] shrink-0">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function hoy() {
  return new Date().toISOString().split("T")[0];
}
