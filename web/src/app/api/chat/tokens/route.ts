import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";
import { generarToken } from "@/lib/bot/puro";

export const dynamic = "force-dynamic";

export async function GET() {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const tokens = await prisma.tokenIntegracion.findMany({
    orderBy: { creadoEn: "desc" },
    select: { id: true, nombre: true, tokenPrefijo: true, activo: true, ultimoUsoEn: true, revocadoEn: true, creadoEn: true },
  });
  return NextResponse.json({ tokens });
}

// El token completo se muestra UNA sola vez, al crearlo. Después solo queda su hash.
export async function POST(req: NextRequest) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const body = await req.json().catch(() => ({}));
  const nombre = String(body.nombre || "").trim().slice(0, 80);
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  const { token, hash, prefijo } = generarToken();
  const creado = await prisma.tokenIntegracion.create({
    data: { nombre, tokenHash: hash, tokenPrefijo: prefijo },
    select: { id: true, nombre: true, tokenPrefijo: true, creadoEn: true },
  });
  return NextResponse.json({ token: creado, valor: token }, { status: 201 });
}
