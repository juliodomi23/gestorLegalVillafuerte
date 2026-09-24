"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Field } from "@/components/modal";
import { prepararExpedienteContratoAsesoriaAction, cambiarStatusAsesoriaAction } from "./actions";

export type AsesoriaFirma = { id: string; nombre: string };

// Al marcar "Contrato firmado" se pide el PDF del contrato para que todo quede listo:
// se abre el expediente de la persona, se sube el contrato (aparece en Contratos) y la
// asesoría queda firmada sola. Si todavía no tienen el documento, se puede marcar sin él.
export default function FirmaContratoModal({
  asesoria,
  onClose,
}: {
  asesoria: AsesoriaFirma | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function cerrar() {
    setArchivo(null);
    setError("");
    onClose();
  }

  async function subir() {
    if (!asesoria) return;
    if (!archivo) {
      setError("Elige el PDF del contrato, o usa “Marcar sin contrato por ahora”.");
      return;
    }
    setError("");
    setGuardando(true);
    try {
      const expedienteId = await prepararExpedienteContratoAsesoriaAction(asesoria.id);
      const datos = new FormData();
      datos.append("file", archivo);
      datos.append("tipo", "contrato");
      const res = await fetch(`/api/expedientes/${expedienteId}/documentos`, { method: "POST", body: datos });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo subir el contrato");
      }
      cerrar();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el contrato");
    }
    setGuardando(false);
  }

  async function marcarSinContrato() {
    if (!asesoria) return;
    setGuardando(true);
    await cambiarStatusAsesoriaAction(asesoria.id, "contrato_firmado");
    setGuardando(false);
    cerrar();
    router.refresh();
  }

  return (
    <Modal
      open={!!asesoria}
      onClose={cerrar}
      title={`Nuevo contrato de ${asesoria?.nombre ?? ""}`}
      onSubmit={subir}
      submitLabel={guardando ? "Guardando…" : "Subir contrato y marcar firmado"}
    >
      <Field label="PDF del contrato firmado" full>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="w-full text-[13px]"
        />
      </Field>
      <p className="col-span-2 text-[12px] text-muted">
        Se crea su expediente y el contrato aparece en Contratos, listo para registrar su plan de pagos.
      </p>
      {error && <p className="col-span-2 text-[12.5px] text-danger bg-danger-wash rounded-lg px-3 py-2">{error}</p>}
      <button
        type="button"
        onClick={marcarSinContrato}
        disabled={guardando}
        className="col-span-2 text-left text-[12.5px] text-navy hover:underline"
      >
        Marcar sin contrato por ahora
      </button>
    </Modal>
  );
}
