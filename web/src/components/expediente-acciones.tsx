"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Modal, Field, Input, Select } from "@/components/modal";
import { editarExpedienteAction, crearActuacionAction, type FormExpediente } from "@/app/(app)/expedientes/actions";
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
    await crearActuacionAction(expedienteId, usuarioId, actForm);
    setSaving(false);
    setActOpen(false);
    setActForm({ tipo: "", descripcion: "", fecha: hoy() });
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
      <Modal open={actOpen} onClose={() => setActOpen(false)} title="Nueva actuación" onSubmit={guardarActuacion} submitLabel={saving ? "Guardando…" : "Registrar"}>
        <Field label="Tipo">
          <Select
            options={TIPOS_ACTUACION}
            value={actForm.tipo}
            onChange={(e) => setActForm((f) => ({ ...f, tipo: e.target.value }))}
          />
        </Field>
        <Field label="Fecha" full>
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
      </Modal>
    </>
  );
}

function hoy() {
  return new Date().toISOString().split("T")[0];
}
