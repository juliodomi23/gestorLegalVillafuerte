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
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id       uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  nombre            text NOT NULL,
  email             text UNIQUE,
  telefono_whatsapp text,                    -- identifica quién dicta por el bot
  rol               text NOT NULL DEFAULT 'abogado'
                      CHECK (rol IN ('admin','abogado','asistente')),
  activo            boolean NOT NULL DEFAULT true,
  creado_en         timestamptz NOT NULL DEFAULT now()
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
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_telefono ON clientes(telefono);


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
  origen        text NOT NULL DEFAULT 'web' CHECK (origen IN ('web','whatsapp')),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asesorias_status ON asesorias(status);


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
                    CHECK (estado IN ('activo','suspendido','cerrado')),
  creado_en       timestamptz NOT NULL DEFAULT now()
);

-- Consulta clave del CRON: a quién hay que llamar hoy
CREATE INDEX idx_seguimientos_proximo
  ON seguimientos(proximo_llamado) WHERE estado = 'activo';


-- =====================================================================
-- 12. DOCUMENTOS (metadatos; el archivo vive en Google Drive)
-- =====================================================================

CREATE TABLE documentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  tipo          text,
  link_drive    text,
  subido_por    uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_exp ON documentos(expediente_id);


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
