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
  pin: string;
  verProductividad: boolean;
  recibeEnvio: string;
  sucursalesACargo: string[];
  personasACargo: string[];
};

// PIN duplicado (P2002 de Prisma) es el único error que un admin puede provocar
// aquí sin querer — se traduce a un mensaje que sí dice qué pasó.
function traducirErrorPin(e: unknown): never {
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
    throw new Error("Ese PIN ya lo tiene otro usuario");
  }
  throw e;
}

export async function crearUsuarioAction(data: FormUsuario) {
  await requireAdmin();
  const d = parsear(usuarioSchema, data);
  if (!d.password) throw new Error("La contraseña es obligatoria para un usuario nuevo");
  const passwordHash = await bcrypt.hash(d.password, 10);
  try {
    await prisma.usuario.create({
      data: {
        nombre: d.nombre,
        email: d.email ? d.email.toLowerCase() : null,
        passwordHash,
        debeCambiarPassword: true,
        rol: d.rol,
        sucursalId: d.sucursalId || null,
        telefonoWhatsapp: d.telefonoWhatsapp || null,
        pin: d.pin || null,
        verProductividad: d.verProductividad,
        recibeEnvio: d.recibeEnvio || null,
        sucursalesACargo: { connect: d.sucursalesACargo.map((id) => ({ id })) },
        personasACargo: { connect: d.personasACargo.map((id) => ({ id })) },
      },
    });
  } catch (e) {
    traducirErrorPin(e);
  }
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
    pin: d.pin || null,
    verProductividad: d.verProductividad,
    recibeEnvio: d.recibeEnvio || null,
    // `set` reemplaza la lista completa: lo que el admin no marcó, se quita.
    sucursalesACargo: { set: d.sucursalesACargo.map((sid) => ({ id: sid })) },
    personasACargo: { set: d.personasACargo.map((uid) => ({ id: uid })) },
  };
  if (d.password) {
    update.passwordHash = await bcrypt.hash(d.password, 10);
    update.debeCambiarPassword = true;
  }
  try {
    await prisma.usuario.update({ where: { id }, data: update });
  } catch (e) {
    traducirErrorPin(e);
  }
  revalidatePath("/configuracion");
}

export async function borrarUsuarioAction(id: string) {
  await requireAdmin();
  await prisma.usuario.update({ where: { id }, data: { activo: false } });
  revalidatePath("/configuracion");
}
