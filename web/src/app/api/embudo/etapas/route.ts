import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChat, requerirChatAdmin } from "@/lib/chat/api";
import { listarEtapas } from "@/lib/chat/embudo";

export const dynamic = "force-dynamic";

const COLOR = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const etapas = await listarEtapas();
  return NextResponse.json({
    etapas: etapas.map((e) => ({ id: e.id, clave: e.clave, nombre: e.nombre, color: e.color, orden: e.orden })),
  });
}

export async function POST(req: NextRequest) {
  const permiso = await requerirChatAdmin();
  if ("error" in permiso) return permiso.error;
  const body = await req.json().catch(() => ({}));
  const nombre = String(body.nombre || "").trim().slice(0, 40);
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  const color = COLOR.test(String(body.color || "")) ? String(body.color) : "#64748b";
  const ultima = await prisma.embudoEtapa.aggregate({ _max: { orden: true } });
  const etapa = await prisma.embudoEtapa.create({
    data: { nombre, color, orden: (ultima._max.orden ?? 0) + 1 },
    select: { id: true, clave: true, nombre: true, color: true, orden: true },
  });
  return NextResponse.json({ etapa }, { status: 201 });
}
