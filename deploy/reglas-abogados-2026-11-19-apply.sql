-- NO EJECUTADO. Idempotente: correrlo dos veces no cambia nada la segunda vez.
-- Respaldar antes: pg_dump. Correr con: psql -v ON_ERROR_STOP=1 -f este.sql
BEGIN;

CREATE TEMP TABLE u AS
  SELECT nombre, id FROM usuarios WHERE nombre IN (
    'Fernando Salas','Mauricio López Meza','Karla Giselle Villafuerte De Paz',
    'Maria del Rosario Alvarez Vera','Carolina Velazquez','Alain Aquiahuatl Gomez');
DO $$ BEGIN IF (SELECT count(*) FROM u) <> 6 THEN RAISE EXCEPTION 'usuarios ambiguos o faltantes'; END IF; END $$;

UPDATE expedientes e SET abogado_responsable_id=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera'), actualizado_en=now()
  WHERE e.id IN ('0be67dbf-c145-4adc-91ab-ac371844a348','1507f2a5-5921-467d-b09a-15ec4c90e805','2f36416c-cc7a-46a6-a2e6-a2b817c88f23','393954b9-9d52-4784-b508-edf087972825','455031a4-9767-430f-a710-d32d3dac40fe','49982c94-5222-4110-bc68-d6abfba2e964','4ff02a64-9002-4587-b28a-fbcc3ac9b3fa','6e22a41d-b383-4404-839e-0e363e82040f','76b75057-facd-40d0-b094-ffd191e8707b','7e5e0ea7-78e7-4460-a43f-ac56a4dad91a','97e4552c-5ad5-4fae-b151-d11beb611927','97e560f1-9501-4525-a249-5364005f4aeb','adf39ffd-52a3-4fea-bc31-5975b1b9be3a','bd55e68e-0d3b-4a3e-ae47-cd82e4a00b94','bd7146be-78c8-4f29-8c61-f06159b2ecb1','c305f96a-b1c4-4f27-aea3-a5f67ee66b33','d6387c56-aea0-4654-8071-ea18fffbe7c4','e6dd6e05-a0a2-4ff3-bc7d-ff2f8e7aab9d','f4e07437-c0c0-40bd-a1b1-345c8e1956c8','fc9aaa9c-24c6-4751-81d2-af54c3dfb7cb')
  AND e.abogado_responsable_id IS DISTINCT FROM (SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera');

INSERT INTO "_ExpedienteCompartido" ("A","B")
  SELECT e.id, (SELECT id FROM u WHERE nombre='Carolina Velazquez') FROM expedientes e
  WHERE e.id IN ('0be67dbf-c145-4adc-91ab-ac371844a348','1507f2a5-5921-467d-b09a-15ec4c90e805','2f36416c-cc7a-46a6-a2e6-a2b817c88f23','393954b9-9d52-4784-b508-edf087972825','455031a4-9767-430f-a710-d32d3dac40fe','49982c94-5222-4110-bc68-d6abfba2e964','4ff02a64-9002-4587-b28a-fbcc3ac9b3fa','6e22a41d-b383-4404-839e-0e363e82040f','76b75057-facd-40d0-b094-ffd191e8707b','7e5e0ea7-78e7-4460-a43f-ac56a4dad91a','97e4552c-5ad5-4fae-b151-d11beb611927','97e560f1-9501-4525-a249-5364005f4aeb','adf39ffd-52a3-4fea-bc31-5975b1b9be3a','bd55e68e-0d3b-4a3e-ae47-cd82e4a00b94','bd7146be-78c8-4f29-8c61-f06159b2ecb1','c305f96a-b1c4-4f27-aea3-a5f67ee66b33','d6387c56-aea0-4654-8071-ea18fffbe7c4','e6dd6e05-a0a2-4ff3-bc7d-ff2f8e7aab9d','f4e07437-c0c0-40bd-a1b1-345c8e1956c8','fc9aaa9c-24c6-4751-81d2-af54c3dfb7cb')
  AND e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera')
ON CONFLICT DO NOTHING;

-- R1
UPDATE expedientes e SET abogado_responsable_id=(SELECT id FROM u WHERE nombre='Karla Giselle Villafuerte De Paz'), actualizado_en=now()
  WHERE e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Fernando Salas')
  AND e.sucursal_id=(SELECT id FROM sucursales WHERE nombre='Tuxtla');
UPDATE expedientes e SET abogado_responsable_id=(SELECT id FROM u WHERE nombre='Mauricio López Meza'), actualizado_en=now()
  WHERE e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Fernando Salas')
  AND e.sucursal_id=(SELECT id FROM sucursales WHERE nombre='Villaflores');

-- R3 y R4 (A = persona a cargo, B = encargado)
INSERT INTO "_EncargadoPersonas" ("A","B")
  SELECT p.id, (SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera') FROM u p
  WHERE p.nombre IN ('Carolina Velazquez','Fernando Salas','Karla Giselle Villafuerte De Paz')
ON CONFLICT DO NOTHING;
INSERT INTO "_EncargadoPersonas" ("A","B")
  SELECT p.id, (SELECT id FROM u WHERE nombre='Alain Aquiahuatl Gomez') FROM u p
  WHERE p.nombre='Karla Giselle Villafuerte De Paz'
ON CONFLICT DO NOTHING;

DELETE FROM "_EncargadoPersonas"
  WHERE "A"=(SELECT id FROM u WHERE nombre='Karla Giselle Villafuerte De Paz')
  AND "B"=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera');
DELETE FROM "_EncargadoPersonas"
  WHERE "A"=(SELECT id FROM u WHERE nombre='Carolina Velazquez')
  AND "B" IN (SELECT id FROM usuarios WHERE nombre ILIKE 'Estrella%' AND activo=false);

COMMIT;
