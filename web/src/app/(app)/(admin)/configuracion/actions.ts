"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function crearUsuarioAction(data: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  sucursalId: string;
  sucursalEncargadaId: string;
  telefonoWhatsapp: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.usuario.create({
    data: {
      nombre: data.nombre.trim(),
      email: data.email.trim().toLowerCase() || null,
      passwordHash,
      rol: data.rol,
      sucursalId: data.sucursalId || null,
      sucursalEncargadaId: data.sucursalEncargadaId || null,
      telefonoWhatsapp: data.telefonoWhatsapp.trim() || null,
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
  const update: Record<string, unknown> = {
    nombre: data.nombre.trim(),
    email: data.email.trim().toLowerCase() || null,
    rol: data.rol,
    sucursalId: data.sucursalId || null,
    sucursalEncargadaId: data.sucursalEncargadaId || null,
    telefonoWhatsapp: data.telefonoWhatsapp.trim() || null,
  };
  if (data.password) {
    update.passwordHash = await bcrypt.hash(data.password, 10);
  }
  await prisma.usuario.update({ where: { id }, data: update });
  revalidatePath("/configuracion");
}

export async function borrarUsuarioAction(id: string) {
  await prisma.usuario.update({ where: { id }, data: { activo: false } });
  revalidatePath("/configuracion");
}
