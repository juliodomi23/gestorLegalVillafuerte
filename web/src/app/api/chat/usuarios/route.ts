import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
  return NextResponse.json({ usuarios });
}
