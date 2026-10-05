CREATE TABLE IF NOT EXISTS lecciones_vistas (
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leccion     text NOT NULL,
  visto_en    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, leccion)
);
