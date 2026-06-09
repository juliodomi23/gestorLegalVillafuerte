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
  };
}
