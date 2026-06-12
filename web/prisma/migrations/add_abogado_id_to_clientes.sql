-- Clientes privados por abogado: cada abogado solo ve sus propios clientes.
-- Aplicar en producción ANTES de desplegar el código que usa cliente.abogadoId.

ALTER TABLE clientes ADD COLUMN abogado_id uuid REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX idx_clientes_abogado ON clientes(abogado_id);

-- Backfill 1: dueño = abogado responsable del expediente más reciente del cliente
UPDATE clientes c SET abogado_id = sub.abogado
FROM (
  SELECT DISTINCT ON (cliente_id) cliente_id, abogado_responsable_id AS abogado
  FROM expedientes
  WHERE cliente_id IS NOT NULL AND abogado_responsable_id IS NOT NULL
  ORDER BY cliente_id, creado_en DESC
) sub
WHERE c.id = sub.cliente_id;

-- Backfill 2: si sigue sin dueño, usar el abogado de su asesoría más reciente
UPDATE clientes c SET abogado_id = sub.abogado
FROM (
  SELECT DISTINCT ON (cliente_id) cliente_id, abogado_id AS abogado
  FROM asesorias
  WHERE cliente_id IS NOT NULL AND abogado_id IS NOT NULL
  ORDER BY cliente_id, creado_en DESC
) sub
WHERE c.id = sub.cliente_id AND c.abogado_id IS NULL;

-- Backfill 3: si sigue sin dueño, usar el abogado de su seguimiento más reciente
UPDATE clientes c SET abogado_id = sub.abogado
FROM (
  SELECT DISTINCT ON (cliente_id) cliente_id, abogado_id AS abogado
  FROM seguimientos
  WHERE cliente_id IS NOT NULL AND abogado_id IS NOT NULL
  ORDER BY cliente_id, creado_en DESC
) sub
WHERE c.id = sub.cliente_id AND c.abogado_id IS NULL;

-- Los clientes que queden con abogado_id NULL solo los ve el admin.
