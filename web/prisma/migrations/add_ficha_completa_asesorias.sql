ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS folio text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS sexo text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS estado_civil text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS escolaridad text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS nacionalidad text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS ocupacion text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS correo text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS domicilio_laboral text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS hijos text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS nombre_hijos text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS presupuesto_opcion text;
ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS presupuesto_porcentaje numeric(5,2);

ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS ultimo_folio integer NOT NULL DEFAULT 0;
