-- =====================================================================
-- GestorLegal — Esquema de base de datos (PostgreSQL)
-- Instancia por despacho (single-tenant): sin despacho_id.
-- Piloto: Villafuerte y Asociados.
-- Fecha: 2026-06-05
--
-- Las tablas de autenticación (User, Account, Session…) las genera
-- Auth.js / Prisma aparte. La tabla `usuarios` de abajo es la del
-- negocio (abogados y staff) y se liga por email.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- para gen_random_uuid()

-- Función para mantener actualizado_en automáticamente
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 1. CONFIGURACIÓN E IDENTIDAD DEL DESPACHO
-- =====================================================================

-- Una sola fila: identifica al despacho dueño de esta instancia.
CREATE TABLE configuracion (
  id              integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_despacho text NOT NULL,
  logo_url        text,
  preferencias    jsonb NOT NULL DEFAULT '{}',
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sucursales (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL,
  direccion text,
  telefono  text,
  creado_en timestamptz NOT NULL DEFAULT now()
);


-- =====================================================================
-- 2. CATÁLOGOS EDITABLES (lo que hace al producto personalizable)
-- =====================================================================

CREATE TABLE cat_materias (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true
);

CREATE TABLE cat_etapas (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  orden  integer,
  activo boolean NOT NULL DEFAULT true
);

CREATE TABLE cat_juzgados (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL,
  direccion text
);


-- =====================================================================
-- 3. USUARIOS (abogados y staff)
-- =====================================================================

CREATE TABLE usuarios (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id          uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  nombre               text NOT NULL,
  email                text UNIQUE,
  password_hash        text,
  telefono_whatsapp    text,                 -- identifica quién dicta por el bot
  rol                  text NOT NULL DEFAULT 'abogado'
                         CHECK (rol IN ('admin','abogado','asistente')),
  sucursal_encargada_id uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  activo               boolean NOT NULL DEFAULT true,
  ver_todas_asesorias  boolean NOT NULL DEFAULT false,
  ver_todas_diligencias boolean NOT NULL DEFAULT false,
  creado_en            timestamptz NOT NULL DEFAULT now()
);

-- El bot busca al usuario por su número de WhatsApp
CREATE INDEX idx_usuarios_whatsapp ON usuarios(telefono_whatsapp);


-- =====================================================================
-- 4. CLIENTES
-- =====================================================================

CREATE TABLE clientes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL,
  tipo      text NOT NULL DEFAULT 'fisica' CHECK (tipo IN ('fisica','moral')),
  telefono  text,                            -- el que usa con el bot externo
  email     text,
  notas     text,
  abogado_id uuid REFERENCES usuarios(id) ON DELETE SET NULL, -- dueño: cada abogado solo ve sus clientes
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_abogado ON clientes(abogado_id);


-- =====================================================================
-- 5. EXPEDIENTES (tabla central)
-- =====================================================================

CREATE TABLE expedientes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_interno         text UNIQUE,                 -- EXP-2026-0142
  numero_judicial        text,                        -- 542/2026 (del juzgado)
  cliente_id             uuid REFERENCES clientes(id) ON DELETE SET NULL,
  rol_cliente            text CHECK (rol_cliente IN ('actor','demandado','tercero')),
  materia                text,                         -- validado contra cat_materias en la app
  tipo_juicio            text,
  juzgado                text,
  etapa_procesal         text,
  estado                 text NOT NULL DEFAULT 'activo'
                           CHECK (estado IN ('activo','suspendido','concluido','archivado')),
  cuantia                numeric(14,2),
  abogado_responsable_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  sucursal_id            uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  resumen                text,                         -- estado actual del caso
  fecha_inicio           date,
  creado_en              timestamptz NOT NULL DEFAULT now(),
  actualizado_en         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exp_abogado  ON expedientes(abogado_responsable_id);
CREATE INDEX idx_exp_cliente  ON expedientes(cliente_id);
CREATE INDEX idx_exp_estado   ON expedientes(estado);
CREATE INDEX idx_exp_numjud   ON expedientes(numero_judicial);

CREATE TRIGGER trg_exp_actualizado
  BEFORE UPDATE ON expedientes
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- =====================================================================
-- 6. PARTES DEL JUICIO
-- =====================================================================

CREATE TABLE partes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  rol           text CHECK (rol IN ('actor','demandado','tercero','abogado_contrario')),
  contacto      text
);

CREATE INDEX idx_partes_exp ON partes(expediente_id);


-- =====================================================================
-- 7. ACTUACIONES (timeline: promociones, acuerdos, notas)
--    Aquí viven "Promoción antes" y "Última promoción" como historial.
-- =====================================================================

CREATE TABLE actuaciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  fecha         date NOT NULL DEFAULT current_date,
  tipo          text CHECK (tipo IN ('promocion','acuerdo','notificacion','audiencia','nota')),
  descripcion   text,
  registrado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  origen        text NOT NULL DEFAULT 'web' CHECK (origen IN ('web','whatsapp')),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_actuaciones_exp ON actuaciones(expediente_id, fecha DESC);


-- =====================================================================
-- 8. AUDIENCIAS
-- =====================================================================

CREATE TABLE audiencias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  fecha_hora    timestamptz NOT NULL,
  lugar         text,
  tipo          text,
  estado        text NOT NULL DEFAULT 'programada'
                  CHECK (estado IN ('programada','realizada','diferida')),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audiencias_fecha ON audiencias(fecha_hora);
CREATE INDEX idx_audiencias_exp   ON audiencias(expediente_id);


-- =====================================================================
-- 9. TÉRMINOS (el corazón del seguimiento — mapea las columnas del Lic.)
--    Fecha del acuerdo, Tipo de Notificación, Es Prevención,
--    Días Para Contestar, Inicio Término, Vencimiento Término.
-- =====================================================================

CREATE TABLE terminos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id       uuid NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  tipo                text NOT NULL DEFAULT 'termino'   -- termino | prorroga | prevencion
                        CHECK (tipo IN ('termino','prorroga','prevencion')),
  descripcion         text,                  -- "contestar demanda", "subsanar prevención"
  fecha_acuerdo       date,                  -- Fecha del acuerdo
  tipo_notificacion   text,                  -- boletín / personal / estrados…
  es_prevencion       boolean NOT NULL DEFAULT false,   -- Es Prevención
  dias_para_contestar integer,               -- Días Para Contestar
  inicio_termino      date,                  -- Inicio Término
  vencimiento_termino date,                  -- Vencimiento Término
  cumplido            boolean NOT NULL DEFAULT false,
  alertado            boolean NOT NULL DEFAULT false,   -- el CRON ya marca esto
  creado_en           timestamptz NOT NULL DEFAULT now()
);

-- Consulta clave: términos vigentes que están por vencer
CREATE INDEX idx_terminos_vencimiento
  ON terminos(vencimiento_termino) WHERE cumplido = false;
CREATE INDEX idx_terminos_exp ON terminos(expediente_id);


-- =====================================================================
-- 10. CITAS (las agenda el bot externo)
-- =====================================================================

CREATE TABLE citas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid REFERENCES clientes(id) ON DELETE SET NULL,
  expediente_id uuid REFERENCES expedientes(id) ON DELETE SET NULL,
  abogado_id    uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  sucursal_id   uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  asunto        text,
  telefono      text,
  fecha_hora    timestamptz NOT NULL,
  estado        text NOT NULL DEFAULT 'agendada'
                  CHECK (estado IN ('agendada','confirmada','cancelada','no_show')),
  origen        text NOT NULL DEFAULT 'manual'
                  CHECK (origen IN ('bot_externo','manual')),
  google_event_id text,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_citas_fecha ON citas(fecha_hora);


-- =====================================================================
-- 11. ASESORÍAS / CONSULTAS
-- =====================================================================

-- Las asesorías son el EMBUDO DE VENTAS (clientes potenciales), no solo una consulta.
CREATE TABLE asesorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid REFERENCES clientes(id) ON DELETE SET NULL,
  expediente_id uuid REFERENCES expedientes(id) ON DELETE SET NULL,  -- si deriva en caso
  sucursal_id   uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  fecha         date NOT NULL DEFAULT current_date,
  nombre        text,                  -- prospecto (puede no ser cliente aún)
  telefono      text,
  edad          text,
  domicilio     text,
  tema          text,                  -- asunto: divorcio, pagaré…
  resumen       text,
  pago_asesoria boolean NOT NULL DEFAULT false,  -- Pagó Asesoría (S/N)
  monto         numeric(14,2),
  seguimiento   text,                  -- acción de seguimiento definida
  status        text NOT NULL DEFAULT 'pendiente'
                  CHECK (status IN ('pendiente','contrato_firmado','no_regreso','descartado')),
  url_documento text,                   -- link Drive al contrato/doc generado por el bot
  abogado_id    uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  abogado_agendo_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  origen        text NOT NULL DEFAULT 'web' CHECK (origen IN ('web','whatsapp')),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asesorias_status ON asesorias(status);
CREATE INDEX idx_asesorias_abogado_agendo ON asesorias(abogado_agendo_id);

CREATE TABLE pagos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         uuid REFERENCES clientes(id) ON DELETE SET NULL,
  cita_id            uuid REFERENCES citas(id) ON DELETE SET NULL,
  asesoria_id        uuid REFERENCES asesorias(id) ON DELETE SET NULL,
  servicio           text NOT NULL,
  concepto           text,
  monto_base         numeric(14,2) NOT NULL,
  comision           numeric(14,2) NOT NULL DEFAULT 0,
  monto_total        numeric(14,2) NOT NULL,
  estado             text NOT NULL DEFAULT 'pending'
                       CHECK (estado IN ('pending','approved','rejected','cancelled','refunded')),
  link_pago          text,
  external_reference text NOT NULL UNIQUE,
  mp_payment_id      text UNIQUE,
  mp_preference_id   text,
  fecha_pago         timestamptz,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  actualizado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_estado_creado ON pagos(estado, creado_en DESC);


-- =====================================================================
-- 11b. SEGUIMIENTOS (CRM ligero — "Casos por Abogado": llamadas recurrentes)
--      El bot recuerda al abogado llamar a sus clientes según frecuencia.
-- =====================================================================

CREATE TABLE seguimientos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid REFERENCES clientes(id) ON DELETE SET NULL,
  abogado_id      uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  sucursal_id     uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  tipo_caso       text,                  -- divorcio / pagaré / laboral…
  fecha_inicio    date,                  -- cuándo firmó contrato
  ultimo_contacto date,                  -- última vez que el abogado llamó
  proximo_llamado date,                  -- cuándo debe volver a llamar
  frecuencia_dias integer,               -- cada cuántos días (7, 15, 30…)
  notas           text,
  estado          text NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo','inactivo')),
  creado_en       timestamptz NOT NULL DEFAULT now()
);

-- Consulta clave del CRON: a quién hay que llamar hoy
CREATE INDEX idx_seguimientos_proximo
  ON seguimientos(proximo_llamado) WHERE estado = 'activo';


-- =====================================================================
-- 11c. DILIGENCIAS (digitaliza la hoja de factura del bufete; folio por
--      sucursal vía sucursales.ultimo_folio, igual que asesorías)
-- =====================================================================

CREATE TABLE diligencias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio          text,
  sucursal_id    uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  abogado_id     uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  cliente_id     uuid REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre text,                  -- fallback cuando no hay cliente vinculado
  fecha          date NOT NULL DEFAULT CURRENT_DATE,
  estado_pago    text NOT NULL DEFAULT 'pendiente',
  creado_en      timestamptz NOT NULL DEFAULT now()
);

-- Renglones de la diligencia (FECHA/DESCRIPCIÓN/ASUNTO/IMPORTE de la hoja de papel).
CREATE TABLE diligencia_renglones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diligencia_id uuid NOT NULL REFERENCES diligencias(id) ON DELETE CASCADE,
  fecha         date,
  descripcion   text,
  asunto        text,
  importe       numeric(14,2) NOT NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE diligencia_comprobantes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diligencia_id  uuid NOT NULL REFERENCES diligencias(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  mime_type      text NOT NULL,
  ruta           text NOT NULL,
  subido_por     uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diligencia_comprobantes_diligencia
  ON diligencia_comprobantes(diligencia_id);


-- =====================================================================
-- 12. DOCUMENTOS (metadatos; el archivo vive en Google Drive)
-- =====================================================================

CREATE TABLE documentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  actuacion_id  uuid REFERENCES actuaciones(id) ON DELETE SET NULL,
  nombre        text NOT NULL,
  tipo          text,
  link_drive    text,
  subido_por    uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_exp ON documentos(expediente_id);
CREATE INDEX idx_documentos_act ON documentos(actuacion_id);


-- =====================================================================
-- 13. MOVIMIENTOS DE CAJA (cortes, honorarios, gastos)
-- =====================================================================

CREATE TABLE movimientos_caja (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id    uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  expediente_id  uuid REFERENCES expedientes(id) ON DELETE SET NULL,
  tipo           text NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  concepto       text,
  monto          numeric(14,2) NOT NULL,
  fecha          date NOT NULL DEFAULT current_date,
  registrado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  origen         text NOT NULL DEFAULT 'web' CHECK (origen IN ('web','whatsapp')),
  creado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_caja_fecha ON movimientos_caja(fecha);


-- =====================================================================
-- 14. LLAMADAS (fase 2 — batch de seguimiento Chiapas)
-- =====================================================================

CREATE TABLE llamadas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  cliente_id  uuid REFERENCES clientes(id) ON DELETE SET NULL,
  fecha       date NOT NULL DEFAULT current_date,
  resultado   text,
  notas       text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);


-- =====================================================================
-- 15. CHAT DE WHATSAPP
-- =====================================================================

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

CREATE TABLE IF NOT EXISTS contactos_whatsapp (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_compat         bigint GENERATED BY DEFAULT AS IDENTITY (START WITH 1000000) UNIQUE,
  canal_id              uuid NOT NULL REFERENCES canales_whatsapp(id) ON DELETE RESTRICT,
  nombre                text NOT NULL,
  telefono              text NOT NULL,
  telefono_normalizado  text NOT NULL,
  source_id             text NOT NULL,
  atributos             jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  actualizado_en        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canal_id, telefono_normalizado),
  UNIQUE (canal_id, source_id)
);

CREATE TABLE IF NOT EXISTS conversaciones (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_compat         bigint GENERATED BY DEFAULT AS IDENTITY (START WITH 1000000) UNIQUE,
  canal_id              uuid NOT NULL REFERENCES canales_whatsapp(id) ON DELETE RESTRICT,
  contacto_whatsapp_id  uuid REFERENCES contactos_whatsapp(id) ON DELETE SET NULL,
  nombre_contacto       text NOT NULL,
  telefono              text NOT NULL,
  telefono_normalizado  text NOT NULL,
  cliente_id            uuid REFERENCES clientes(id) ON DELETE SET NULL,
  prospecto_id          uuid,
  responsable_id        uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  estado                text NOT NULL DEFAULT 'abierta'
                        CHECK (estado IN ('abierta', 'pendiente', 'cerrada', 'resuelta', 'pospuesta')),
  atributos             jsonb NOT NULL DEFAULT '{}'::jsonb,
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
  numero_compat    bigint GENERATED BY DEFAULT AS IDENTITY (START WITH 1000000) UNIQUE,
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
  privado          boolean NOT NULL DEFAULT false,
  media_ruta       text,
  media_mime       text,
  media_nombre     text,
  media_tamano     bigint CHECK (media_tamano IS NULL OR media_tamano BETWEEN 0 AND 16777216),
  timestamp        timestamptz NOT NULL DEFAULT now(),
  creado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS etiquetas_chat (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL UNIQUE,
  color           text NOT NULL DEFAULT '#64748b',
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversaciones_etiquetas (
  conversacion_id  uuid NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  etiqueta_id      uuid NOT NULL REFERENCES etiquetas_chat(id) ON DELETE CASCADE,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversacion_id, etiqueta_id)
);

CREATE TABLE IF NOT EXISTS plantillas_mensaje (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  contenido   text NOT NULL,
  categoria   text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tokens_integracion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  token_hash      text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  token_prefijo   text NOT NULL,
  activo          boolean NOT NULL DEFAULT true,
  ultimo_uso_en   timestamptz,
  revocado_en     timestamptz,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhooks_integracion (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL,
  url               text NOT NULL,
  secreto_cifrado   text,
  eventos           text[] NOT NULL DEFAULT ARRAY['message_created', 'message_updated', 'conversation_created', 'conversation_status_changed', 'conversation_updated', 'contact_updated']::text[],
  activo            boolean NOT NULL DEFAULT true,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auditoria_bot (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id            uuid REFERENCES tokens_integracion(id) ON DELETE SET NULL,
  token_fingerprint   text,
  metodo              text NOT NULL,
  ruta                text NOT NULL,
  status_http         integer NOT NULL CHECK (status_http BETWEEN 100 AND 599),
  accion              text NOT NULL,
  conversacion_id     uuid REFERENCES conversaciones(id) ON DELETE SET NULL,
  ip_origen           text,
  detalle             jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entregas_webhook (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id         uuid REFERENCES webhooks_integracion(id) ON DELETE SET NULL,
  mensaje_id         uuid REFERENCES mensajes(id) ON DELETE SET NULL,
  evento             text NOT NULL CHECK (evento IN ('message_created', 'message_updated', 'conversation_created', 'conversation_status_changed', 'conversation_updated', 'contact_updated')),
  payload            jsonb NOT NULL,
  estado             text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviando', 'entregado', 'fallido')),
  intentos           integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  proximo_intento_en timestamptz NOT NULL DEFAULT now(),
  ultimo_error       text,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  actualizado_en     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO etiquetas_chat (nombre, color) VALUES
  ('bot_off', '#dc2626'),
  ('escalado_humano', '#ea580c'),
  ('recordatorio_enviado', '#2563eb'),
  ('no_asistio', '#7c3aed'),
  ('cita_confirmada', '#16a34a')
ON CONFLICT (nombre) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_conversaciones_ultimo_mensaje
  ON conversaciones(ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_cliente
  ON conversaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_prospecto
  ON conversaciones(prospecto_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_timestamp
  ON mensajes(conversacion_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_contactos_whatsapp_telefono
  ON contactos_whatsapp(telefono_normalizado);
CREATE INDEX IF NOT EXISTS idx_conversaciones_contacto_whatsapp
  ON conversaciones(contacto_whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_bot_creado
  ON auditoria_bot(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_entregas_webhook_pendientes
  ON entregas_webhook(estado, proximo_intento_en)
  WHERE estado IN ('pendiente', 'fallido');


-- =====================================================================
-- SEED INICIAL (datos base de Villafuerte)
-- =====================================================================

INSERT INTO configuracion (id, nombre_despacho)
VALUES (1, 'Villafuerte y Asociados');

INSERT INTO cat_materias (nombre) VALUES
  ('Civil'), ('Mercantil'), ('Penal'), ('Familiar'),
  ('Laboral'), ('Amparo'), ('Administrativo');

INSERT INTO cat_etapas (nombre, orden) VALUES
  ('Demanda', 1), ('Contestación', 2), ('Pruebas', 3),
  ('Alegatos', 4), ('Sentencia', 5), ('Ejecución', 6);

-- Sucursales reales del despacho (Chiapas)
INSERT INTO sucursales (nombre) VALUES
  ('Tuxtla'), ('San Cristóbal'), ('Tapachula'), ('Villaflores'), ('Comitán');

-- Los juzgados y usuarios (abogados) reales se cargan en el alta.

-- El usuario admin inicial NO se crea aquí (no commiteamos contraseñas ni hashes).
-- Se crea con el seed: `node prisma/seed.mjs`, que lee ADMIN_EMAIL y ADMIN_PASSWORD
-- del entorno. El Dockerfile lo ejecuta en el arranque.
