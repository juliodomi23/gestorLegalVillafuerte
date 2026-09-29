-- Distingue quién agendó de quién atendió la asesoría.
ALTER TABLE asesorias
  ADD COLUMN IF NOT EXISTS abogado_agendo_id uuid REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ver_todas_asesorias boolean NOT NULL DEFAULT false;

-- Karen recibe la lista general del despacho y es quien solicitó este acceso.
UPDATE usuarios
SET ver_todas_asesorias = true
WHERE lower(nombre) = 'karen' OR recibe_envio = 'todas';

CREATE INDEX IF NOT EXISTS idx_asesorias_abogado_agendo
  ON asesorias(abogado_agendo_id);

-- Los registros existentes parten del único dato histórico disponible.
UPDATE asesorias
SET abogado_agendo_id = abogado_id
WHERE abogado_agendo_id IS NULL;

-- La interfaz nueva trabaja con dos estados. Los estados históricos que ya no
-- generaban llamadas se conservan como inactivos.
ALTER TABLE seguimientos DROP CONSTRAINT IF EXISTS seguimientos_estado_check;

UPDATE seguimientos
SET estado = 'inactivo'
WHERE estado IN ('suspendido', 'cerrado');

ALTER TABLE seguimientos
  ADD CONSTRAINT seguimientos_estado_check CHECK (estado IN ('activo', 'inactivo'));

-- Bitácora de cobros de Mercado Pago. No calcula la comisión: recibe el importe
-- configurado por n8n y conserva el desglose para auditoría.
CREATE TABLE IF NOT EXISTS pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  cita_id uuid REFERENCES citas(id) ON DELETE SET NULL,
  asesoria_id uuid REFERENCES asesorias(id) ON DELETE SET NULL,
  servicio text NOT NULL,
  concepto text,
  monto_base numeric(14,2) NOT NULL,
  comision numeric(14,2) NOT NULL DEFAULT 0,
  monto_total numeric(14,2) NOT NULL,
  estado text NOT NULL DEFAULT 'pending',
  link_pago text,
  external_reference text NOT NULL UNIQUE,
  mp_payment_id text UNIQUE,
  mp_preference_id text,
  fecha_pago timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pagos_estado_check CHECK (estado IN ('pending','approved','rejected','cancelled','refunded'))
);

CREATE INDEX IF NOT EXISTS idx_pagos_estado_creado
  ON pagos(estado, creado_en DESC);
