import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";
import { obtenerConversacion } from "@/lib/chat/servicio";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const conversacion = await obtenerConversacion(params.id);
  if (!conversacion) return NextResponse.json({ error: "conversación inexistente" }, { status: 404 });
  return NextResponse.json({ conversacion });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const body = await req.json().catch(() => ({}));
  const estado = String(body.estado || "");
  if (!new Set(["abierta", "pendiente", "cerrada"]).has(estado)) {
    return NextResponse.json({ error: "estado inválido" }, { status: 400 });
  }
  const result = await prisma.conversacion.updateMany({ where: { id: params.id }, data: { estado } });
  if (!result.count) return NextResponse.json({ error: "conversación inexistente" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
