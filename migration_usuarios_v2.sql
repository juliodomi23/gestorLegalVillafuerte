-- Migración: agrega password_hash y sucursal_encargada_id a usuarios
-- Ejecutar UNA VEZ en la BD de producción (no afecta datos existentes).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS password_hash        text,
  ADD COLUMN IF NOT EXISTS sucursal_encargada_id uuid REFERENCES sucursales(id) ON DELETE SET NULL;
