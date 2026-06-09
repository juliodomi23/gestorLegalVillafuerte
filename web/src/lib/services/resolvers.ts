import { prisma } from "@/lib/prisma";

// El bot manda nombres ("Christian", "Tuxtla"); aquí los convertimos a IDs.

export async function resolverSucursal(nombre?: string): Promise<string | null> {
  if (!nombre) return null;
  const s = await prisma.sucursal.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });
  return s?.id ?? null;
}

export async function resolverAbogado(nombreOTelefono?: string): Promise<string | null> {
  if (!nombreOTelefono) return null;
  const u = await prisma.usuario.findFirst({
    where: {
      OR: [
        { nombre: { equals: nombreOTelefono, mode: "insensitive" } },
        { telefonoWhatsapp: nombreOTelefono },
      ],
    },
  });
  return u?.id ?? null;
}

// Busca un cliente por teléfono (o nombre); si no existe, lo crea.
export async function upsertCliente(nombre: string, telefono?: string): Promise<string> {
  if (telefono) {
    const existente = await prisma.cliente.findFirst({ where: { telefono } });
    if (existente) return existente.id;
  }
  const porNombre = await prisma.cliente.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });
  if (porNombre) return porNombre.id;

  const nuevo = await prisma.cliente.create({ data: { nombre, telefono } });
  return nuevo.id;
}
