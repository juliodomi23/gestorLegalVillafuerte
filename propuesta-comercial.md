# GestorLegal — Estrategia de Producto y Piloto

**Fecha:** 2026-06-05
**Preparado por:** Ámbar Rojo Studios
**Piloto:** Villafuerte y Asociados (sin costo — caso de éxito para vender al gremio)
**Objetivo:** producto propio de Ámbar Rojo para bufetes jurídicos

---

## 1. El problema

Hoy el despacho lleva el seguimiento de expedientes en **Google Sheets + Drive + n8n**,
alimentado por los bots de WhatsApp. Funciona, pero:

- La información está **dispersa** y empieza a fallar con el volumen (pestañas mal nombradas,
  datos en null, reportes que se rompen).
- No hay una **vista única** de los expedientes, su término procesal y sus vencimientos.
- El riesgo más caro en un litigio — **perder un término** — depende de hojas de cálculo.

## 2. La solución

**GestorLegal**: una aplicación web a la medida que consolida todo en una base de datos real,
conservando lo único que el despacho ya tiene y nadie en el mercado ofrece: **captura y
gestión por WhatsApp**.

- Tablero de expedientes con su **término vigente y cuenta regresiva** siempre visible.
- Agenda unificada (audiencias, citas, vencimientos).
- Documentos (PDF) por expediente, guardados en el **Drive del despacho**.
- Caja y cortes por sucursal.
- Los bots de WhatsApp siguen funcionando y ahora **escriben a la base de datos**, no a Sheets.

## 3. Alcance del MVP (Fase 1)

| Módulo | Incluye |
|--------|---------|
| Expedientes | Alta, ficha completa, partes, actuaciones (timeline), término procesal |
| Vencimientos | Tablero de términos por vencer + alertas (reusa los CRON actuales) |
| Agenda | Audiencias, citas y vencimientos en una vista |
| Documentos | Subida de PDF por expediente a Google Drive |
| Caja | Movimientos y cortes por sucursal |
| Clientes | Directorio con expedientes y asesorías |
| Usuarios y roles | Admin / Abogado / Asistente con permisos |
| Captura WhatsApp | Migrar las tools del bot de Sheets → base de datos |

**Fuera del MVP (Fase 2, opcional):** plan de honorarios con parcialidades, módulo de
llamadas (batch Chiapas), reportes avanzados, app móvil.

## 4. Modelo: piloto + producto

**Villafuerte es el cliente piloto, sin costo de desarrollo.** A cambio, Ámbar Rojo obtiene:
- Pruebas reales en producción (el despacho ya genera volumen y casos de verdad).
- Un **caso de éxito / referencia** para vender el producto en su gremio jurídico.
- Feedback directo del Lic. para pulir el producto.

El costo de construirlo se trata como **inversión de producto de Ámbar Rojo**, no como
proyecto facturado. El hosting va en el VPS que el despacho ya tiene; Drive es gratuito.

### El producto: GestorLegal para otros bufetes

La arquitectura **instancia por despacho** + **personalizable** está hecha para revender:
cada bufete tiene su propia instancia (datos aislados — clave en legal) configurada con sus
sucursales, materias y juzgados.

**Precio sugerido por bufete (preliminar, a validar):**
| Concepto | Rango |
|----------|-------|
| Setup + personalización (configurar instancia, catálogos, migrar datos) | $8,000 – $15,000 MXN |
| Mensualidad (hosting + mantenimiento + soporte) | $1,500 – $2,500 MXN/mes |

El paquete fuerte para el gremio es **gestor + bot de captura por WhatsApp**: ese combo es lo
que ningún software del mercado ofrece y justifica el precio frente a opciones genéricas.

## 5. El pitch para el gremio: ¿por qué GestorLegal y no un software del mercado?

| | GestorLegal | MiDespacho.Cloud / LegalSurf / Clio |
|---|---|---|
| Captura por WhatsApp | **Sí** (bot incluido) | No |
| A la medida del flujo del despacho | **Sí** | No, plantilla genérica |
| Datos aislados en instancia propia | **Sí** | En la nube compartida del proveedor |
| Resuelve la baja adopción (el dolor real) | **Sí** (los datos entran solos) | No, hay que teclear todo |
| Costo mensual | $1,500 – $2,500 | $399 – $2,680 MXN/usuario |

El argumento no es ser más barato, es **resolver el problema #1 del sector**: que los abogados
no capturan porque es tedioso. Con captura por WhatsApp, los datos entran solos.

## 6. Tiempos estimados

| Fase | Entregable | Duración |
|------|-----------|----------|
| 1 | Base de datos + expedientes + ficha | ~2 semanas |
| 2 | Vencimientos, agenda, documentos, caja | ~2 semanas |
| 3 | Migración de tools WhatsApp + pruebas | ~1 semana |

**Total estimado: 4–5 semanas** (puede ajustarse por carga de trabajo).

---

*Documento interno de estrategia. Los precios al gremio son preliminares; validar con los
primeros prospectos antes de cerrar.*
