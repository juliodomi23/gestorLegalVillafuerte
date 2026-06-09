# GestorLegal — Sistema de Diseño

**Concepto:** *"Expediente moderno"* — la elegancia de un despacho clásico (papel hueso,
tinta, serif editorial, sellos) con la claridad de una app moderna. Estilo base de la skill
ui-ux-pro-max: **Trust & Authority** (navy de autoridad + ámbar de confianza). El ámbar
conecta además con la marca Ámbar Rojo.

**Evitar:** gradientes AI morado/rosa, Inter en todo, look de admin Bootstrap genérico.

---

## Paleta (tokens Tailwind)

| Token | Hex | Uso |
|-------|-----|-----|
| `paper` | #F6F2EA | Fondo (hueso cálido, evoca papel) |
| `surface` | #FFFFFF | Tarjetas y tablas |
| `ink` | #1A1714 | Texto principal (tinta cálida) |
| `muted` | #6B6259 | Texto secundario |
| `line` | #E7E0D4 | Bordes cálidos |
| `navy` / `navy.deep` | #1E3A5F / #162A41 | Autoridad, sidebar, primary |
| `amber` / `amber.soft` / `amber.wash` | #B45309 / #C8881E / #F4E9D7 | Acento / sello / CTA |
| `success` / `success.wash` | #3F6B4F / #E6EEE7 | "Al día", origen WhatsApp |
| `danger` / `danger.wash` | #9B2C2C / #F3E2E0 | Vencimientos críticos |

## Tipografía

- **Headings y números (KPIs, n.º de expediente):** EB Garamond (serif). Da el carácter
  editorial/legal que distingue de los admin genéricos.
- **UI y cuerpo (tablas, labels, botones):** Lato (sans).
- **Números:** `font-variant-numeric: tabular-nums` para que alineen en tablas.
- Labels tipo *eyebrow*: 11px, mayúsculas, `letter-spacing:.14em`, bold.

## Principios de componentes

- **Sidebar tinta** (navy.deep) con indicador activo: barra izquierda ámbar de 3px.
- **Hairline ámbar** bajo el topbar (degradado a transparente) como firma visual.
- **Término vigente destacado** en la ficha de expediente: bloque con cuenta regresiva
  (lo más crítico del litigio, siempre visible).
- **Chips tipo sello:** estados con punto de color + texto, fondos `*-wash`.
- **Origen WhatsApp** marcado con chip verde + ícono — el diferenciador, visible en
  dashboard, timeline y caja.
- **Iconos:** Lucide (SVG), nunca emojis. 24px viewBox, stroke 1.75.
- Hover: solo color/borde/sombra (sin scale que mueva layout). Transiciones 150–300ms.

## Al portar a Next.js

1. Estos tokens van a `tailwind.config.ts` (theme.extend.colors / fontFamily).
2. Fuentes vía `next/font/google` (EB Garamond + Lato).
3. Componentes base con shadcn/ui, re-temizados con estos tokens (no el look default).
4. Iconos con `lucide-react`.

Referencia visual viva: `prototipo.html`.
