CREATE TABLE IF NOT EXISTS auditoria (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid REFERENCES usuarios(id),
  expediente_id  uuid,
  accion         text NOT NULL,
  entidad        text NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_expediente_id_idx ON auditoria(expediente_id);
