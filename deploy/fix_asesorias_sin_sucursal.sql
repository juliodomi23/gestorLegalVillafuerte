-- Fix: asignar sucursal_id a asesorías que quedaron con NULL
-- Causa: resolvers.ts usaba `equals` en lugar de `contains` para resolver sucursal
-- Corregido en: commit 0f23a75
-- Seguro: solo toca registros con sucursal_id IS NULL y abogado_id conocido

-- Ver cuántos registros se van a afectar antes de ejecutar:
-- SELECT COUNT(*) FROM asesorias WHERE sucursal_id IS NULL AND abogado_id IS NOT NULL;

UPDATE asesorias
SET sucursal_id = u.sucursal_id
FROM usuarios u
WHERE asesorias.abogado_id = u.id
  AND asesorias.sucursal_id IS NULL
  AND asesorias.abogado_id IS NOT NULL;
