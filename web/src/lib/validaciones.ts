// Schemas de validación reutilizables (Zod).
// Centralizan reglas de negocio: enums de rol, montos válidos, URLs seguras.
// Se usan tanto en server actions como en la API que consume n8n.

import { z } from "zod";

// ── Primitivas reutilizables ──────────────────────────────────────────────────

export const rolSchema = z.enum(["admin", "abogado", "asistente"]);

// Solo http(s): evita XSS por `javascript:` y esquemas raros en enlaces que luego
// se renderizan como <a href={...}>.
export const urlHttpSchema = z
  .string()
  .trim()
  .url("URL inválida")
  .refine((u) => /^https?:\/\//i.test(u), "La URL debe empezar con http:// o https://");

// Monto monetario: número finito, no negativo.
export const montoSchema = z.coerce
  .number()
  .finite("Monto inválido")
  .min(0, "El monto no puede ser negativo");

const textoOpcional = z.string().trim().max(500).optional().or(z.literal(""));
const telefonoSchema = z.string().trim().max(30).optional().or(z.literal(""));
const emailOpcional = z.string().trim().email("Email inválido").optional().or(z.literal(""));

// ── Schemas de entidades ──────────────────────────────────────────────────────

export const usuarioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  email: emailOpcional,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional().or(z.literal("")),
  rol: rolSchema,
  sucursalId: z.string().optional().or(z.literal("")),
  sucursalEncargadaId: z.string().optional().or(z.literal("")),
  telefonoWhatsapp: telefonoSchema,
});

export const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  tipo: z.string().max(20),
  telefono: telefonoSchema,
  email: emailOpcional,
});

export const movimientoCajaSchema = z.object({
  tipo: z.enum(["ingreso", "egreso", "Ingreso", "Egreso"]),
  monto: montoSchema,
  concepto: textoOpcional,
  sucursal: z.string().optional().or(z.literal("")),
  expediente: z.string().optional().or(z.literal("")),
});

// Movimiento de caja que llega desde n8n (WhatsApp). Valida tipos y monto.
export const movimientoN8nSchema = z.object({
  tipo: z.enum(["ingreso", "egreso"]),
  monto: montoSchema,
  concepto: z.string().trim().max(500).optional(),
  sucursal: z.string().optional(),
  numeroExpediente: z.string().optional(),
  abogado: z.string().optional(),
  fecha: z.string().optional(),
  origen: z.enum(["web", "whatsapp"]).optional(),
});

// Devuelve los datos parseados o lanza un Error con el primer mensaje legible.
export function parsear<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const primer = r.error.issues[0];
    throw new Error(primer?.message ?? "Datos inválidos");
  }
  return r.data;
}
