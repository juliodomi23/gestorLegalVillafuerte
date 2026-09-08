CREATE TABLE IF NOT EXISTS diligencias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio          text,
  sucursal_id    uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  abogado_id     uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  cliente_id     uuid REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre text,
  fecha          date NOT NULL DEFAULT CURRENT_DATE,
  creado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diligencia_renglones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diligencia_id uuid NOT NULL REFERENCES diligencias(id) ON DELETE CASCADE,
  fecha         date,
  descripcion   text,
  asunto        text,
  importe       numeric(14,2) NOT NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);
