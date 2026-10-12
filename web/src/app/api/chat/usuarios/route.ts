import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatReasignar } from "@/lib/chat/api";

export const dynamic = "force-dynamic";

// A quién se puede asignar una conversación: solo lo consultan administración y recepción.
export async function GET() {
  const permiso = await requerirChatReasignar();
  if ("error" in permiso) return permiso.error;
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
  return NextResponse.json({ usuarios });
}
