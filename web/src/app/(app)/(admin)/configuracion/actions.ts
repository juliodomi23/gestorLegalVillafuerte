"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guard";
import { parsear, usuarioSchema } from "@/lib/validaciones";

export type FormUsuario = {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  sucursalId: string;
  telefonoWhatsapp: string;
  sucursalesACargo: string[];
  personasACargo: string[];
};

export async function crearUsuarioAction(data: FormUsuario) {
  await requireAdmin();
  const d = parsear(usuarioSchema, data);
  if (!d.password) throw new Error("La contraseña es obligatoria para un usuario nuevo");
  const passwordHash = await bcrypt.hash(d.password, 10);
  await prisma.usuario.create({
    data: {
      nombre: d.nombre,
      email: d.email ? d.email.toLowerCase() : null,
      passwordHash,
      debeCambiarPassword: true,
      rol: d.rol,
      sucursalId: d.sucursalId || null,
      telefonoWhatsapp: d.telefonoWhatsapp || null,
      sucursalesACargo: { connect: d.sucursalesACargo.map((id) => ({ id })) },
      personasACargo: { connect: d.personasACargo.map((id) => ({ id })) },
    },
  });
  revalidatePath("/configuracion");
}

export async function editarUsuarioAction(id: string, data: FormUsuario) {
  await requireAdmin();
  const d = parsear(usuarioSchema, data);
  const update: Record<string, unknown> = {
    nombre: d.nombre,
    email: d.email ? d.email.toLowerCase() : null,
    rol: d.rol,
    sucursalId: d.sucursalId || null,
    telefonoWhatsapp: d.telefonoWhatsapp || null,
    // `set` reemplaza la lista completa: lo que el admin no marcó, se quita.
    sucursalesACargo: { set: d.sucursalesACargo.map((sid) => ({ id: sid })) },
    personasACargo: { set: d.personasACargo.map((uid) => ({ id: uid })) },
  };
  if (d.password) {
    update.passwordHash = await bcrypt.hash(d.password, 10);
    update.debeCambiarPassword = true;
  }
  await prisma.usuario.update({ where: { id }, data: update });
  revalidatePath("/configuracion");
}

export async function borrarUsuarioAction(id: string) {
  await requireAdmin();
  await prisma.usuario.update({ where: { id }, data: { activo: false } });
  revalidatePath("/configuracion");
}
