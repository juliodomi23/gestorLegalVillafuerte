import { prisma } from "@/lib/prisma";

// Rastro mínimo de quién hizo qué a un expediente, sobre todo para borrados.
// No debe tumbar la acción principal si falla, así que solo se loguea el error.
export async function registrarAuditoria(
  usuarioId: string,
  expedienteId: string | null,
  accion: "crear" | "editar" | "borrar",
  entidad: string,
) {
  try {
    await prisma.auditoria.create({ data: { usuarioId, expedienteId, accion, entidad } });
  } catch (err) {
    console.error("No se pudo registrar auditoría:", err);
  }
}
