-- Agregar actuacion_id a documentos para vincular documentos a actuaciones específicas
ALTER TABLE documentos
  ADD COLUMN actuacion_id uuid REFERENCES actuaciones(id) ON DELETE SET NULL;

CREATE INDEX idx_documentos_act ON documentos(actuacion_id);
