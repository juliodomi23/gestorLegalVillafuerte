// Seed del usuario admin inicial.
// Lee ADMIN_EMAIL y ADMIN_PASSWORD del entorno — nunca se commitean credenciales.
// Idempotente: si el admin ya existe, no hace nada.
//
// Uso local:  ADMIN_EMAIL=tu@correo.mx ADMIN_PASSWORD=clave node prisma/seed.mjs
// En prod:    el Dockerfile lo ejecuta en el arranque con las vars del entorno.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("[seed] ADMIN_EMAIL o ADMIN_PASSWORD no definidos — se omite el seed del admin.");
    return;
  }
  if (password.length < 8) {
    throw new Error("[seed] ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  }

  const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (existente) {
    console.log(`[seed] El usuario ${email} ya existe — no se hace nada.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.usuario.create({
    data: {
      nombre: process.env.ADMIN_NOMBRE || "Administrador",
      email: email.toLowerCase(),
      passwordHash,
      rol: "admin",
      activo: true,
    },
  });
  console.log(`[seed] Usuario admin ${email} creado.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
