"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Field, Input, Select } from "@/components/modal";
import { variablesDePlantilla } from "@/lib/meta/plantillaMeta";

type Plantilla = {
  name: string;
  language: string;
  status?: string;
  components?: { type?: string; text?: string }[];
};

function cuerpo(plantilla: Plantilla | null) {
  return plantilla?.components?.find((item) => item.type === "BODY")?.text || "";
}

export function EnviarPlantilla({
  open,
  onClose,
  canalId,
  conversacionId,
  nombreContacto,
  onEnviado,
}: {
  open: boolean;
  onClose: () => void;
  canalId: string;
  conversacionId: string;
  nombreContacto: string;
  onEnviado: () => void;
}) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [clave, setClave] = useState("");
  const [valores, setValores] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const elegida = useMemo(() => plantillas.find((item) => `${item.name}:${item.language}` === clave) || null, [plantillas, clave]);
  const variables = variablesDePlantilla(cuerpo(elegida));
  const previa = cuerpo(elegida).replace(/\{\{(\d+)\}\}/g, (_, numero) => valores[Number(numero) - 1] || `{{${numero}}}`);

  useEffect(() => {
    if (!open) return;
    setError("");
    fetch(`/api/meta/templates?canalId=${encodeURIComponent(canalId)}`)
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "No se pudieron cargar las plantillas");
        setPlantillas((data.plantillas || []).filter((item: Plantilla) => item.status === "APPROVED"));
      })
      .catch((cause) => setError(cause.message));
  }, [open, canalId]);

  function elegir(valor: string) {
    setClave(valor);
    const plantilla = plantillas.find((item) => `${item.name}:${item.language}` === valor) || null;
    setValores(variablesDePlantilla(cuerpo(plantilla)).length ? [nombreContacto] : []);
  }

  async function enviar() {
    if (!elegida || variables.some((numero) => !valores[numero - 1]?.trim())) return;
    setEnviando(true);
    setError("");
    const response = await fetch("/api/mensajes/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversacionId,
        plantilla: {
          name: elegida.name,
          language: elegida.language,
          variables: valores.slice(0, variables.length),
          vistaPrevia: previa,
        },
      }),
    });
    const data = await response.json().catch(() => ({}));
    setEnviando(false);
    if (!response.ok) return setError(data.error || "No se pudo enviar la plantilla");
    onEnviado();
    setClave("");
    setValores([]);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Enviar plantilla de Meta" onSubmit={enviar} submitLabel={enviando ? "Enviando…" : "Enviar"}>
      <Field label="Plantilla aprobada" full>
        <Select value={clave} onChange={(event) => elegir(event.target.value)} options={plantillas.map((item) => `${item.name}:${item.language}`)} />
      </Field>
      {variables.map((numero) => (
        <Field key={numero} label={`Valor para {{${numero}}}`} full>
          <Input value={valores[numero - 1] || ""} onChange={(event) => setValores((actual) => { const copia = [...actual]; copia[numero - 1] = event.target.value; return copia; })} />
        </Field>
      ))}
      {elegida && <div className="col-span-full rounded-lg bg-paper p-3 text-[13px] whitespace-pre-wrap">{previa}</div>}
      {error && <p className="col-span-full text-[12px] text-danger">{error}</p>}
      {!error && plantillas.length === 0 && <p className="col-span-full text-[12px] text-muted">No hay plantillas aprobadas disponibles.</p>}
    </Modal>
  );
}
