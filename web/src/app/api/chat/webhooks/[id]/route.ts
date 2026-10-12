import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";
import { EVENTOS_WEBHOOK, validarUrlWebhook } from "@/lib/bot/webhooks";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const body = await req.json().catch(() => ({}));
  const datos: { activo?: boolean; nombre?: string; url?: string; eventos?: string[] } = {};
  if (typeof body.activo === "boolean") datos.activo = body.activo;
  if (typeof body.nombre === "string" && body.nombre.trim()) datos.nombre = body.nombre.trim().slice(0, 80);
  if (typeof body.url === "string") {
    const destino = validarUrlWebhook(body.url.trim());
    if (!destino.ok) return NextResponse.json({ error: destino.motivo }, { status: 400 });
    datos.url = destino.url.toString();
  }
  if (Array.isArray(body.eventos)) {
    const eventos = body.eventos.map(String).filter((evento: string) => (EVENTOS_WEBHOOK as readonly string[]).includes(evento));
    if (!eventos.length) return NextResponse.json({ error: "Elige al menos un evento" }, { status: 400 });
    datos.eventos = eventos;
  }
  const resultado = await prisma.webhookIntegracion.updateMany({ where: { id: params.id }, data: datos });
  if (!resultado.count) return NextResponse.json({ error: "webhook inexistente" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const resultado = await prisma.webhookIntegracion.deleteMany({ where: { id: params.id } });
  if (!resultado.count) return NextResponse.json({ error: "webhook inexistente" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
