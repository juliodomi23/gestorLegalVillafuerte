import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const etiquetas = await prisma.etiquetaChat.findMany({ orderBy: { nombre: "asc" }, select: { nombre: true, color: true } });
  return NextResponse.json({ etiquetas });
}

export async function POST(req: NextRequest) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const body = await req.json().catch(() => ({}));
  const nombre = String(body.nombre || "").trim().slice(0, 60);
  const color = /^#[0-9a-fA-F]{6}$/.test(String(body.color || "")) ? String(body.color) : "#64748b";
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  const etiqueta = await prisma.etiquetaChat.upsert({
    where: { nombre },
    update: { color },
    create: { nombre, color },
    select: { nombre: true, color: true },
  });
  return NextResponse.json({ etiqueta }, { status: 201 });
}
