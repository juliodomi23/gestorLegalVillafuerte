ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS presupuesto_texto text;
ALTER TABLE asesorias DROP COLUMN IF EXISTS presupuesto_opcion;
ALTER TABLE asesorias DROP COLUMN IF EXISTS presupuesto_porcentaje;
