import { prisma } from "@/lib/prisma";
import ConfiguracionClient, { type UsuarioView } from "./client";

export default async function ConfiguracionPage() {
  const [usuariosRaw, sucursales] = await Promise.all([
    prisma.usuario.findMany({
      include: { sucursal: true, sucursalEncargada: true },
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
    sucursal: u.sucursal?.nombre ?? null,
    sucursalId: u.sucursalId,
    sucursalEncargada: u.sucursalEncargada?.nombre ?? null,
    sucursalEncargadaId: u.sucursalEncargadaId,
    activo: u.activo,
  }));

  return (
    <ConfiguracionClient
      usuarios={usuarios}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre }))}
    />
  );
}
