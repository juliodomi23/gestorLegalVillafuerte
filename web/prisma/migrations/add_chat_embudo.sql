-- Embudo del chat: etapas configurables, etapa de cada conversación y vínculo
-- de citas y asesorías con la conversación. Aditivo e idempotente.
BEGIN;

CREATE TABLE IF NOT EXISTS embudo_etapas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identifica las etapas que se mueven solas (nuevo, agendo_cita, ...). Las que agrega
  -- el despacho no tienen clave y solo se mueven a mano o por el bot.
  clave           text UNIQUE,
  nombre          text NOT NULL,
  color           text NOT NULL DEFAULT '#64748b',
  orden           integer NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO embudo_etapas (clave, nombre, color, orden)
SELECT v.clave, v.nombre, v.color, v.orden
FROM (VALUES
  ('nuevo',            'Nuevo',            '#64748b', 1),
  ('agendo_cita',      'Agendó cita',      '#2563eb', 2),
  ('agendo_llamada',   'Agendó llamada',   '#7c3aed', 3),
  ('asesorado',        'Asesorado',        '#d97706', 4),
  ('contrato_firmado', 'Contrato firmado', '#16a34a', 5)
) AS v(clave, nombre, color, orden)
WHERE NOT EXISTS (SELECT 1 FROM embudo_etapas);

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS etapa_id uuid REFERENCES embudo_etapas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS etapa_desde timestamptz;

UPDATE conversaciones
SET etapa_id = (SELECT id FROM embudo_etapas WHERE clave = 'nuevo'),
    etapa_desde = COALESCE(ultimo_mensaje_at, creado_en)
WHERE etapa_id IS NULL
  AND EXISTS (SELECT 1 FROM embudo_etapas WHERE clave = 'nuevo');

CREATE TABLE IF NOT EXISTS conversaciones_etapas_historial (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id    uuid NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  etapa_id           uuid REFERENCES embudo_etapas(id) ON DELETE SET NULL,
  etapa_anterior_id  uuid REFERENCES embudo_etapas(id) ON DELETE SET NULL,
  origen             text NOT NULL CHECK (origen IN ('automatico', 'bot', 'usuario')),
  usuario_id         uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  detalle            text,
  creado_en          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS conversacion_id uuid REFERENCES conversaciones(id) ON DELETE SET NULL;
ALTER TABLE asesorias
  ADD COLUMN IF NOT EXISTS conversacion_id uuid REFERENCES conversaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversaciones_etapa ON conversaciones(etapa_id);
CREATE INDEX IF NOT EXISTS idx_citas_conversacion ON citas(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_asesorias_conversacion ON asesorias(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_etapas_historial_conversacion
  ON conversaciones_etapas_historial(conversacion_id, creado_en DESC);

COMMIT;
