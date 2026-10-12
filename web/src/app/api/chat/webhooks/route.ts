import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";
import { cifrarTokenMeta } from "@/lib/meta/credentials";
import { EVENTOS_WEBHOOK, validarUrlWebhook } from "@/lib/bot/webhooks";

export const dynamic = "force-dynamic";

const vista = { id: true, nombre: true, url: true, eventos: true, activo: true, creadoEn: true, secretoCifrado: true } as const;

function sinSecreto<T extends { secretoCifrado: string | null }>(webhook: T) {
  const { secretoCifrado, ...resto } = webhook;
  return { ...resto, tieneSecreto: Boolean(secretoCifrado) };
}

export async function GET() {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const webhooks = await prisma.webhookIntegracion.findMany({ orderBy: { creadoEn: "desc" }, select: vista });
  return NextResponse.json({ webhooks: webhooks.map(sinSecreto) });
}

export async function POST(req: NextRequest) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const body = await req.json().catch(() => ({}));
  const nombre = String(body.nombre || "").trim().slice(0, 80);
  const url = String(body.url || "").trim();
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  const destino = validarUrlWebhook(url);
  if (!destino.ok) return NextResponse.json({ error: destino.motivo }, { status: 400 });
  const eventos = Array.isArray(body.eventos)
    ? body.eventos.map(String).filter((evento: string) => (EVENTOS_WEBHOOK as readonly string[]).includes(evento))
    : [...EVENTOS_WEBHOOK];
  if (!eventos.length) return NextResponse.json({ error: "Elige al menos un evento" }, { status: 400 });

  // El secreto firma cada entrega; se muestra una sola vez.
  const secreto = randomBytes(24).toString("hex");
  const creado = await prisma.webhookIntegracion.create({
    data: { nombre, url: destino.url.toString(), eventos, secretoCifrado: cifrarTokenMeta(secreto) },
    select: vista,
  });
  return NextResponse.json({ webhook: sinSecreto(creado), secreto }, { status: 201 });
}
