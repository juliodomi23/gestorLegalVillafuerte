"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  resolverSucursalPorSlug,
  siguienteTipo,
  evaluarGeocerca,
  pinBloqueado,
  registrarIntentoPin,
} from "@/lib/checador";

export type ResultadoChecada = { tipo: "entrada" | "salida"; nombre: string; enSitio: boolean | null };

export type Ubicacion = { lat: number; lon: number; precision: number } | null;

// Devuelve el en_sitio a guardar, o lanza si el GPS confirma que está fuera del área.
async function resolverEnSitio(sucursalId: string, ubicacion: Ubicacion): Promise<boolean | null> {
  const sucursal = await prisma.sucursal.findUnique({
    where: { id: sucursalId },
    select: { lat: true, lon: true, radioM: true },
  });
  if (!sucursal) throw new Error("Sucursal no encontrada");
  const resultado = evaluarGeocerca(
    sucursal,
    ubicacion?.lat ?? null,
    ubicacion?.lon ?? null,
    ubicacion?.precision ?? null
  );
  if (resultado === "fuera") throw new Error("Estás fuera del área de la sucursal. Acércate y vuelve a intentar.");
  return resultado === "dentro" ? true : null;
}

// Con la sesión ya iniciada en el celular: no pide nada, solo confirma quién es.
export async function registrarChecadaSesion(sucursalSlug: string, ubicacion: Ubicacion): Promise<ResultadoChecada> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No hay sesión activa");
  const sucursal = await resolverSucursalPorSlug(sucursalSlug);
  if (!sucursal) throw new Error("Sucursal no encontrada");

  const enSitio = await resolverEnSitio(sucursal.id, ubicacion);
  const tipo = await siguienteTipo(session.user.id);
  await prisma.checada.create({
    data: { usuarioId: session.user.id, sucursalId: sucursal.id, tipo, origen: "sesion", enSitio },
  });
  return { tipo, nombre: session.user.name ?? "", enSitio };
}

// Sin sesión (celular prestado, o quien no tiene cuenta en el sistema): PIN.
export async function registrarChecadaPin(
  pin: string,
  sucursalSlug: string,
  ubicacion: Ubicacion
): Promise<ResultadoChecada> {
  const sucursal = await resolverSucursalPorSlug(sucursalSlug);
  if (!sucursal) throw new Error("Sucursal no encontrada");

  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";
  const clave = `${ip}:${sucursalSlug}`;
  if (pinBloqueado(clave)) throw new Error("Demasiados intentos. Espera unos minutos.");

  if (!/^\d{4,8}$/.test(pin)) {
    registrarIntentoPin(clave, false);
    throw new Error("PIN inválido");
  }
  const usuario = await prisma.usuario.findFirst({ where: { pin, activo: true } });
  if (!usuario) {
    registrarIntentoPin(clave, false);
    throw new Error("PIN incorrecto");
  }
  registrarIntentoPin(clave, true);

  const enSitio = await resolverEnSitio(sucursal.id, ubicacion);
  const tipo = await siguienteTipo(usuario.id);
  await prisma.checada.create({
    data: { usuarioId: usuario.id, sucursalId: sucursal.id, tipo, origen: "pin", enSitio },
  });
  return { tipo, nombre: usuario.nombre, enSitio };
}
