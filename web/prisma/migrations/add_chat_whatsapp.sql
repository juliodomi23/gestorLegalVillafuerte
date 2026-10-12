BEGIN;

CREATE TABLE IF NOT EXISTS canales_whatsapp (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           text NOT NULL,
  proveedor        text NOT NULL DEFAULT 'cloud_api'
                   CHECK (proveedor IN ('cloud_api')),
  telefono         text,
  phone_number_id  text NOT NULL UNIQUE,
  waba_id          text NOT NULL,
  estado           text NOT NULL DEFAULT 'desconectado'
                   CHECK (estado IN ('conectado', 'desconectado')),
  config           jsonb NOT NULL DEFAULT '{}'::jsonb,
  activo           boolean NOT NULL DEFAULT true,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversaciones (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id              uuid NOT NULL REFERENCES canales_whatsapp(id) ON DELETE RESTRICT,
  nombre_contacto       text NOT NULL,
  telefono              text NOT NULL,
  telefono_normalizado  text NOT NULL,
  cliente_id            uuid REFERENCES clientes(id) ON DELETE SET NULL,
  prospecto_id          uuid,
  responsable_id        uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  estado                text NOT NULL DEFAULT 'abierta'
                        CHECK (estado IN ('abierta', 'pendiente', 'cerrada')),
  no_leidos             integer NOT NULL DEFAULT 0 CHECK (no_leidos >= 0),
  ultimo_mensaje_at     timestamptz,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  actualizado_en        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canal_id, telefono_normalizado)
);

DO $$
BEGIN
  IF to_regclass('public.prospectos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'conversaciones_prospecto_id_fkey'
         AND conrelid = 'conversaciones'::regclass
     ) THEN
    ALTER TABLE conversaciones
      ADD CONSTRAINT conversaciones_prospecto_id_fkey
      FOREIGN KEY (prospecto_id) REFERENCES prospectos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mensajes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id  uuid NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  direccion        text NOT NULL CHECK (direccion IN ('entrante', 'saliente')),
  tipo             text NOT NULL DEFAULT 'texto'
                   CHECK (tipo IN ('texto', 'imagen', 'audio', 'video', 'documento', 'ubicacion', 'plantilla')),
  contenido        text,
  status           text NOT NULL DEFAULT 'enviado'
                   CHECK (status IN ('pendiente', 'enviado', 'entregado', 'leido', 'fallido')),
  error_detalle    text,
  wa_message_id    text UNIQUE,
  enviado_por      uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  timestamp        timestamptz NOT NULL DEFAULT now(),
  creado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plantillas_mensaje (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  contenido   text NOT NULL,
  categoria   text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_ultimo_mensaje
  ON conversaciones(ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_cliente
  ON conversaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_prospecto
  ON conversaciones(prospecto_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_timestamp
  ON mensajes(conversacion_id, timestamp);

COMMIT;
