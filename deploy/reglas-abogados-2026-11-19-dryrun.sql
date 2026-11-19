-- Solo SELECT. Cuenta lo que movería reglas-abogados-2026-11-19-apply.sql.
WITH u AS (
  SELECT nombre, id FROM usuarios WHERE nombre IN (
    'Fernando Salas','Mauricio López Meza','Karla Giselle Villafuerte De Paz',
    'Maria del Rosario Alvarez Vera','Carolina Velazquez','Alain Aquiahuatl Gomez')
)
SELECT 'usuarios resueltos (esperado 6)' regla, count(*) n FROM u
UNION ALL
SELECT 'R1 Fernando Tuxtla -> Giselle', count(*) FROM expedientes e
  WHERE e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Fernando Salas')
  AND e.sucursal_id=(SELECT id FROM sucursales WHERE nombre='Tuxtla')
UNION ALL
SELECT 'R1 Fernando Villaflores -> Mauricio', count(*) FROM expedientes e
  WHERE e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Fernando Salas')
  AND e.sucursal_id=(SELECT id FROM sucursales WHERE nombre='Villaflores')
UNION ALL
SELECT 'R1 Fernando otra sucursal/sin sucursal (no se mueve)', count(*) FROM expedientes e
  WHERE e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Fernando Salas')
  AND e.sucursal_id IS DISTINCT FROM (SELECT id FROM sucursales WHERE nombre='Tuxtla')
  AND e.sucursal_id IS DISTINCT FROM (SELECT id FROM sucursales WHERE nombre='Villaflores')
UNION ALL
SELECT 'R2 ex-Estrella (csv 2026-10-14) -> Rosario (falta mover)', count(*) FROM expedientes e
  WHERE e.id IN ('0be67dbf-c145-4adc-91ab-ac371844a348','1507f2a5-5921-467d-b09a-15ec4c90e805','2f36416c-cc7a-46a6-a2e6-a2b817c88f23','393954b9-9d52-4784-b508-edf087972825','455031a4-9767-430f-a710-d32d3dac40fe','49982c94-5222-4110-bc68-d6abfba2e964','4ff02a64-9002-4587-b28a-fbcc3ac9b3fa','6e22a41d-b383-4404-839e-0e363e82040f','76b75057-facd-40d0-b094-ffd191e8707b','7e5e0ea7-78e7-4460-a43f-ac56a4dad91a','97e4552c-5ad5-4fae-b151-d11beb611927','97e560f1-9501-4525-a249-5364005f4aeb','adf39ffd-52a3-4fea-bc31-5975b1b9be3a','bd55e68e-0d3b-4a3e-ae47-cd82e4a00b94','bd7146be-78c8-4f29-8c61-f06159b2ecb1','c305f96a-b1c4-4f27-aea3-a5f67ee66b33','d6387c56-aea0-4654-8071-ea18fffbe7c4','e6dd6e05-a0a2-4ff3-bc7d-ff2f8e7aab9d','f4e07437-c0c0-40bd-a1b1-345c8e1956c8','fc9aaa9c-24c6-4751-81d2-af54c3dfb7cb')
  AND e.abogado_responsable_id IS DISTINCT FROM (SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera')
  AND e.abogado_responsable_id IS DISTINCT FROM (SELECT id FROM u WHERE nombre='Carolina Velazquez')
UNION ALL
SELECT 'R2 ex-Estrella ya con Rosario', count(*) FROM expedientes e
  WHERE e.id IN ('0be67dbf-c145-4adc-91ab-ac371844a348','1507f2a5-5921-467d-b09a-15ec4c90e805','2f36416c-cc7a-46a6-a2e6-a2b817c88f23','393954b9-9d52-4784-b508-edf087972825','455031a4-9767-430f-a710-d32d3dac40fe','49982c94-5222-4110-bc68-d6abfba2e964','4ff02a64-9002-4587-b28a-fbcc3ac9b3fa','6e22a41d-b383-4404-839e-0e363e82040f','76b75057-facd-40d0-b094-ffd191e8707b','7e5e0ea7-78e7-4460-a43f-ac56a4dad91a','97e4552c-5ad5-4fae-b151-d11beb611927','97e560f1-9501-4525-a249-5364005f4aeb','adf39ffd-52a3-4fea-bc31-5975b1b9be3a','bd55e68e-0d3b-4a3e-ae47-cd82e4a00b94','bd7146be-78c8-4f29-8c61-f06159b2ecb1','c305f96a-b1c4-4f27-aea3-a5f67ee66b33','d6387c56-aea0-4654-8071-ea18fffbe7c4','e6dd6e05-a0a2-4ff3-bc7d-ff2f8e7aab9d','f4e07437-c0c0-40bd-a1b1-345c8e1956c8','fc9aaa9c-24c6-4751-81d2-af54c3dfb7cb')
  AND e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera')
UNION ALL
SELECT 'R2 ex-Estrella hoy de Carolina (ya los ve, no se tocan)', count(*) FROM expedientes e
  WHERE e.id IN ('0be67dbf-c145-4adc-91ab-ac371844a348','1507f2a5-5921-467d-b09a-15ec4c90e805','2f36416c-cc7a-46a6-a2e6-a2b817c88f23','393954b9-9d52-4784-b508-edf087972825','455031a4-9767-430f-a710-d32d3dac40fe','49982c94-5222-4110-bc68-d6abfba2e964','4ff02a64-9002-4587-b28a-fbcc3ac9b3fa','6e22a41d-b383-4404-839e-0e363e82040f','76b75057-facd-40d0-b094-ffd191e8707b','7e5e0ea7-78e7-4460-a43f-ac56a4dad91a','97e4552c-5ad5-4fae-b151-d11beb611927','97e560f1-9501-4525-a249-5364005f4aeb','adf39ffd-52a3-4fea-bc31-5975b1b9be3a','bd55e68e-0d3b-4a3e-ae47-cd82e4a00b94','bd7146be-78c8-4f29-8c61-f06159b2ecb1','c305f96a-b1c4-4f27-aea3-a5f67ee66b33','d6387c56-aea0-4654-8071-ea18fffbe7c4','e6dd6e05-a0a2-4ff3-bc7d-ff2f8e7aab9d','f4e07437-c0c0-40bd-a1b1-345c8e1956c8','fc9aaa9c-24c6-4751-81d2-af54c3dfb7cb')
  AND e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Carolina Velazquez')
UNION ALL
SELECT 'R2 compartir con Carolina (filas nuevas)', count(*) FROM expedientes e
  WHERE e.id IN ('0be67dbf-c145-4adc-91ab-ac371844a348','1507f2a5-5921-467d-b09a-15ec4c90e805','2f36416c-cc7a-46a6-a2e6-a2b817c88f23','393954b9-9d52-4784-b508-edf087972825','455031a4-9767-430f-a710-d32d3dac40fe','49982c94-5222-4110-bc68-d6abfba2e964','4ff02a64-9002-4587-b28a-fbcc3ac9b3fa','6e22a41d-b383-4404-839e-0e363e82040f','76b75057-facd-40d0-b094-ffd191e8707b','7e5e0ea7-78e7-4460-a43f-ac56a4dad91a','97e4552c-5ad5-4fae-b151-d11beb611927','97e560f1-9501-4525-a249-5364005f4aeb','adf39ffd-52a3-4fea-bc31-5975b1b9be3a','bd55e68e-0d3b-4a3e-ae47-cd82e4a00b94','bd7146be-78c8-4f29-8c61-f06159b2ecb1','c305f96a-b1c4-4f27-aea3-a5f67ee66b33','d6387c56-aea0-4654-8071-ea18fffbe7c4','e6dd6e05-a0a2-4ff3-bc7d-ff2f8e7aab9d','f4e07437-c0c0-40bd-a1b1-345c8e1956c8','fc9aaa9c-24c6-4751-81d2-af54c3dfb7cb')
  AND e.abogado_responsable_id=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera')
  AND NOT EXISTS (SELECT 1 FROM "_ExpedienteCompartido" c WHERE c."A"=e.id AND c."B"=(SELECT id FROM u WHERE nombre='Carolina Velazquez'))
UNION ALL
SELECT 'R3 Rosario ve a Carolina (fila nueva)', count(*) FROM u
  WHERE nombre='Carolina Velazquez'
  AND NOT EXISTS (SELECT 1 FROM "_EncargadoPersonas" p WHERE p."A"=u.id AND p."B"=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera'))
UNION ALL
SELECT 'R3 Rosario ve a Fernando (fila nueva)', count(*) FROM u
  WHERE nombre='Fernando Salas'
  AND NOT EXISTS (SELECT 1 FROM "_EncargadoPersonas" p WHERE p."A"=u.id AND p."B"=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera'))
UNION ALL
SELECT 'R3 Rosario ve a Giselle (fila nueva)', count(*) FROM u
  WHERE nombre='Karla Giselle Villafuerte De Paz'
  AND NOT EXISTS (SELECT 1 FROM "_EncargadoPersonas" p WHERE p."A"=u.id AND p."B"=(SELECT id FROM u WHERE nombre='Maria del Rosario Alvarez Vera'))
UNION ALL
SELECT 'R4 Alain encargado de Giselle (fila nueva)', count(*) FROM u
  WHERE nombre='Karla Giselle Villafuerte De Paz'
  AND NOT EXISTS (SELECT 1 FROM "_EncargadoPersonas" p WHERE p."A"=u.id AND p."B"=(SELECT id FROM u WHERE nombre='Alain Aquiahuatl Gomez'));

-- Estado actual de encargados (A = persona a cargo, B = encargado)
SELECT a.nombre persona, b.nombre encargado FROM "_EncargadoPersonas" p
  JOIN usuarios a ON a.id=p."A" JOIN usuarios b ON b.id=p."B" ORDER BY 2,1;
-- Ambiguedades: nombres repetidos entre los 6 usuarios
SELECT nombre, count(*) FROM usuarios WHERE nombre ~* '(fernando|mauricio|giselle|rosario|carolina|alain)' GROUP BY 1 HAVING count(*)>1;
