"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function cambiarPasswordAction(password: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("No autenticado");
  if (!password || password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { passwordHash, debeCambiarPassword: false },
  });
}
