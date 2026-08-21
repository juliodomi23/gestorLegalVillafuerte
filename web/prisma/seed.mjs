// Seed del usuario admin inicial y de la rutina del Coordinador de Operaciones.
// Lee ADMIN_EMAIL y ADMIN_PASSWORD del entorno — nunca se commitean credenciales.
// Idempotente: si el admin ya existe, no hace nada.
//
// Uso local:  ADMIN_EMAIL=tu@correo.mx ADMIN_PASSWORD=clave node prisma/seed.mjs
// En prod:    el Dockerfile lo ejecuta en el arranque con las vars del entorno.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const aqui = dirname(fileURLToPath(import.meta.url));

// La rutina semanal del coordinador (74 actividades del Excel del despacho).
// Idempotente por (diaSemana, orden): al redesplegar actualiza texto y hora, y no
// duplica. Si en el sistema se desactivó una actividad, se respeta y no revive.
async function sembrarActividades() {
  const ruta = join(aqui, "actividades-coordinacion.json");
  let actividades;
  try {
    actividades = JSON.parse(readFileSync(ruta, "utf8"));
  } catch {
    console.log("[seed] actividades-coordinacion.json no encontrado — se omite.");
    return;
  }

  let creadas = 0;
  for (const a of actividades) {
    const existente = await prisma.actividadPlantilla.findFirst({
      where: { diaSemana: a.diaSemana, orden: a.orden },
    });
    if (existente) {
      await prisma.actividadPlantilla.update({
        where: { id: existente.id },
        data: { hora: a.hora, descripcion: a.descripcion },
      });
    } else {
      await prisma.actividadPlantilla.create({ data: a });
      creadas++;
    }
  }
  console.log(
    `[seed] Rutina del coordinador: ${actividades.length} actividades revisadas, ${creadas} nuevas.`
  );
}

async function sembrarAdmin() {
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

async function main() {
  await sembrarAdmin();
  await sembrarActividades();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
