INSERT INTO clientes (id, nombre, tipo, telefono, email, notas)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'Mariana López Demo', 'fisica', '961 555 0101', 'mariana@example.test', 'Datos ficticios de demostración'),
  ('d1000000-0000-4000-8000-000000000002', 'Comercializadora Horizonte Demo', 'moral', '+52 55 5555 0102', 'contacto@horizonte.example.test', 'Datos ficticios de demostración')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prospectos (id, nombre, telefono, ciudad, asunto, estado, nota)
VALUES
  ('d2000000-0000-4000-8000-000000000001', 'Daniela Méndez Demo', '5219615550103', 'Tuxtla Demo', 'Consulta mercantil ficticia', 'por_contactar', 'Datos ficticios de demostración')
ON CONFLICT (id) DO NOTHING;

INSERT INTO canales_whatsapp (
  id, nombre, proveedor, telefono, phone_number_id, waba_id, estado, config, activo
)
VALUES (
  'd3000000-0000-4000-8000-000000000001',
  'WhatsApp Demo',
  'cloud_api',
  '+52 55 0000 0000',
  '100000000000001',
  '200000000000001',
  'conectado',
  '{"mock":true}'::jsonb,
  true
)
ON CONFLICT (phone_number_id) DO UPDATE
SET nombre = EXCLUDED.nombre, estado = EXCLUDED.estado, activo = true, config = EXCLUDED.config;

INSERT INTO conversaciones (
  id, canal_id, nombre_contacto, telefono, telefono_normalizado,
  cliente_id, prospecto_id, estado, no_leidos, ultimo_mensaje_at
)
VALUES
  ('d4000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'Mariana López Demo', '529615550101', '9615550101', 'd1000000-0000-4000-8000-000000000001', NULL, 'abierta', 2, now() - interval '4 minutes'),
  ('d4000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000001', 'Comercializadora Horizonte Demo', '525555550102', '5555550102', 'd1000000-0000-4000-8000-000000000002', NULL, 'abierta', 0, now() - interval '2 hours'),
  ('d4000000-0000-4000-8000-000000000003', 'd3000000-0000-4000-8000-000000000001', 'Daniela Méndez Demo', '529615550103', '9615550103', NULL, 'd2000000-0000-4000-8000-000000000001', 'pendiente', 1, now() - interval '8 hours'),
  ('d4000000-0000-4000-8000-000000000004', 'd3000000-0000-4000-8000-000000000001', 'Óscar Robles Demo', '529615550104', '9615550104', NULL, NULL, 'abierta', 0, now() - interval '26 hours'),
  ('d4000000-0000-4000-8000-000000000005', 'd3000000-0000-4000-8000-000000000001', 'Elena Ruiz Demo', '525555550105', '5555550105', NULL, NULL, 'cerrada', 0, now() - interval '3 days'),
  ('d4000000-0000-4000-8000-000000000006', 'd3000000-0000-4000-8000-000000000001', 'Iván Torres Demo', '529615550106', '9615550106', NULL, NULL, 'abierta', 1, now() - interval '30 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mensajes (
  id, conversacion_id, direccion, tipo, contenido, status, wa_message_id, timestamp
)
VALUES
  ('d5000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'entrante', 'texto', 'Hola, quisiera revisar el avance de mi asunto.', 'entregado', 'wamid.demo.001', now() - interval '5 minutes'),
  ('d5000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', 'saliente', 'texto', 'Claro, permítame revisar su expediente.', 'leido', 'wamid.demo.002', now() - interval '4 minutes'),
  ('d5000000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000002', 'entrante', 'documento', '[documento]', 'entregado', 'wamid.demo.003', now() - interval '2 hours'),
  ('d5000000-0000-4000-8000-000000000004', 'd4000000-0000-4000-8000-000000000003', 'entrante', 'texto', 'Necesito una asesoría para mi negocio.', 'entregado', 'wamid.demo.004', now() - interval '8 hours'),
  ('d5000000-0000-4000-8000-000000000005', 'd4000000-0000-4000-8000-000000000004', 'entrante', 'texto', '¿Podrían volver a contactarme?', 'entregado', 'wamid.demo.005', now() - interval '26 hours'),
  ('d5000000-0000-4000-8000-000000000006', 'd4000000-0000-4000-8000-000000000005', 'entrante', 'imagen', '[imagen]', 'entregado', 'wamid.demo.006', now() - interval '3 days'),
  ('d5000000-0000-4000-8000-000000000007', 'd4000000-0000-4000-8000-000000000006', 'entrante', 'audio', '[audio]', 'entregado', 'wamid.demo.007', now() - interval '30 minutes')
ON CONFLICT (id) DO NOTHING;
