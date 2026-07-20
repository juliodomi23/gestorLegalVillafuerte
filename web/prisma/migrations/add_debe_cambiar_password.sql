ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_password boolean NOT NULL DEFAULT false;
