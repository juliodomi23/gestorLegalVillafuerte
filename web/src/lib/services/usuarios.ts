import { prisma } from "@/lib/prisma";

// El bot identifica quién le escribe por su número de WhatsApp.
export async function usuarioPorTelefono(telefono: string) {
  const u = await prisma.usuario.findFirst({
    where: { telefonoWhatsapp: telefono, activo: true },
    include: { sucursal: true },
  });
  if (!u) return null;
  return {
    id: u.id,
    nombre: u.nombre,
    rol: u.rol,
    sucursal: u.sucursal?.nombre ?? null,
    // Lo usa el bot interno para saber que esta persona coordina operaciones y
    // puede pedirle recordatorios para los abogados, sin ser admin.
    coordinacion: u.verProductividad,
  };
}
