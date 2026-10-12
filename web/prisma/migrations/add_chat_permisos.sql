-- Permiso de recepción del chat: ve las conversaciones por atender y las reasigna.
-- Aditivo e idempotente. Al crear la columna, quien ya tenía "ver todas las asesorías"
-- (recepción/coordinación) la recibe encendida; después se maneja desde Configuración > Usuarios.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'ver_chat_recepcion'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN ver_chat_recepcion boolean NOT NULL DEFAULT false;
    UPDATE usuarios SET ver_chat_recepcion = true WHERE ver_todas_asesorias AND rol <> 'admin';
  END IF;
END $$;

COMMIT;
