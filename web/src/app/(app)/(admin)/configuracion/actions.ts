"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guard";
import { parsear, usuarioSchema } from "@/lib/validaciones";

export async function crearUsuarioAction(data: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  sucursalId: string;
  sucursalEncargadaId: string;
  telefonoWhatsapp: string;
}) {
  await requireAdmin();
  const d = parsear(usuarioSchema, data);
  if (!d.password) throw new Error("La contraseña es obligatoria para un usuario nuevo");
  const passwordHash = await bcrypt.hash(d.password, 10);
  await prisma.usuario.create({
    data: {
      nombre: d.nombre,
      email: d.email ? d.email.toLowerCase() : null,
      passwordHash,
      rol: d.rol,
      sucursalId: d.sucursalId || null,
      sucursalEncargadaId: d.sucursalEncargadaId || null,
      telefonoWhatsapp: d.telefonoWhatsapp || null,
    },
  });
  revalidatePath("/configuracion");
}

export async function editarUsuarioAction(
  id: string,
  data: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    sucursalId: string;
    sucursalEncargadaId: string;
    telefonoWhatsapp: string;
  }
) {
  await requireAdmin();
  const d = parsear(usuarioSchema, data);
  const update: Record<string, unknown> = {
    nombre: d.nombre,
    email: d.email ? d.email.toLowerCase() : null,
    rol: d.rol,
    sucursalId: d.sucursalId || null,
    sucursalEncargadaId: d.sucursalEncargadaId || null,
    telefonoWhatsapp: d.telefonoWhatsapp || null,
  };
  if (d.password) {
    update.passwordHash = await bcrypt.hash(d.password, 10);
  }
  await prisma.usuario.update({ where: { id }, data: update });
  revalidatePath("/configuracion");
}

export async function borrarUsuarioAction(id: string) {
  await requireAdmin();
  await prisma.usuario.update({ where: { id }, data: { activo: false } });
  revalidatePath("/configuracion");
}
