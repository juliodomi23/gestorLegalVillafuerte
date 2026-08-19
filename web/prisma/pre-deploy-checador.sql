-- Correr UNA VEZ en la BD de producción ANTES de desplegar el reloj checador.
--
-- Por qué: el arranque del contenedor es `prisma db push && seed && npm start`, y `db push`
-- se niega a agregar un @unique sobre una tabla con filas ("There might be data loss") y sale
-- con error. Al ser una cadena con &&, la app no arranca y TODO el sistema da 502 — no sólo el
-- checador. Pasó el 2026-08-19.
--
-- Creando la columna y el índice a mano (con el nombre que Prisma espera, `usuarios_pin_key`),
-- el `db push` del arranque encuentra la base en sync y pasa limpio.
--
-- Es seguro: la columna nace toda en NULL y Postgres permite múltiples NULL bajo un índice
-- único, así que no puede chocar con datos existentes.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin text;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_pin_key ON usuarios(pin);

-- Verificación (debe devolver una fila con la columna y una con el índice):
-- SELECT column_name FROM information_schema.columns WHERE table_name='usuarios' AND column_name='pin';
-- SELECT indexname FROM pg_indexes WHERE tablename='usuarios' AND indexname='usuarios_pin_key';
