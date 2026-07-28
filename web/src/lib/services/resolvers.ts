import { prisma } from "@/lib/prisma";

// El bot manda nombres ("Christian", "Tuxtla"); aquí los convertimos a IDs.

export async function resolverSucursal(nombre?: string): Promise<string | null> {
  if (!nombre) return null;
  const s = await prisma.sucursal.findFirst({
    where: { nombre: { contains: nombre, mode: "insensitive" } },
  });
  return s?.id ?? null;
}

// Folio consecutivo por sucursal (00001, 00002...). UPDATE...RETURNING es atómico
// bajo el row lock de Postgres, así que dos abogados registrando a la vez en la
// misma sucursal nunca chocan folio, sin necesitar una transacción aparte.
export async function asignarFolio(sucursalId?: string | null): Promise<string | null> {
  if (!sucursalId) return null;
  const rows = await prisma.$queryRaw<{ ultimo_folio: number }[]>`
    UPDATE sucursales SET ultimo_folio = ultimo_folio + 1 WHERE id = ${sucursalId}::uuid RETURNING ultimo_folio
  `;
  return rows[0] ? String(rows[0].ultimo_folio).padStart(5, "0") : null;
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
// abogadoId define el dueño del cliente nuevo (los clientes son privados por abogado);
// si el cliente ya existe NO se le cambia el dueño.
export async function upsertCliente(
  nombre: string,
  telefono?: string,
  abogadoId?: string | null,
): Promise<string> {
  if (telefono) {
    const existente = await prisma.cliente.findFirst({ where: { telefono } });
    if (existente) return existente.id;
  }
  const porNombre = await prisma.cliente.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });
  if (porNombre) return porNombre.id;

  const nuevo = await prisma.cliente.create({
    data: { nombre, telefono, abogadoId: abogadoId ?? null },
  });
  return nuevo.id;
}
