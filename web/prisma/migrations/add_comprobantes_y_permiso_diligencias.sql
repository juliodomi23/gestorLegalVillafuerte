ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ver_todas_diligencias boolean NOT NULL DEFAULT false;

-- Karen solicitó el acceso general a Diligencias. También cubre una variante de
-- nombre completo sin depender de mayúsculas o acentos.
UPDATE usuarios
SET ver_todas_diligencias = true
WHERE lower(nombre) LIKE '%karen%';

CREATE TABLE IF NOT EXISTS diligencia_comprobantes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diligencia_id  uuid NOT NULL REFERENCES diligencias(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  mime_type      text NOT NULL,
  ruta           text NOT NULL,
  subido_por     uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diligencia_comprobantes_diligencia
  ON diligencia_comprobantes(diligencia_id);
