import { prisma } from "@/lib/prisma";
import ConfiguracionClient, { type UsuarioView } from "./client";

export default async function ConfiguracionPage() {
  const [usuariosRaw, sucursales] = await Promise.all([
    prisma.usuario.findMany({
      include: {
        sucursal: true,
        sucursalesACargo: { select: { id: true, nombre: true }, orderBy: { nombre: "asc" } },
        personasACargo: { select: { id: true, nombre: true }, orderBy: { nombre: "asc" } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const usuarios: UsuarioView[] = usuariosRaw.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    telefonoWhatsapp: u.telefonoWhatsapp,
    pin: u.pin,
    verProductividad: u.verProductividad,
    sucursal: u.sucursal?.nombre ?? null,
    sucursalId: u.sucursalId,
    sucursalesACargo: u.sucursalesACargo,
    personasACargo: u.personasACargo,
    activo: u.activo,
  }));

  return (
    <ConfiguracionClient
      usuarios={usuarios}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre }))}
    />
  );
}
