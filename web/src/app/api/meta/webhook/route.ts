import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWhatsappActivo } from "@/lib/chat/modulo";
import { verificarFirmaMeta } from "@/lib/meta/signature";
import { normalizarEstadosMeta, normalizarMensajesMeta } from "@/lib/channel/cloudapi";
import { actualizarEstadosMensajes, ingestarMensajeEntrante } from "@/lib/chat/servicio";
import { procesarEntrante } from "@/lib/chat/entrante";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function phoneNumberId(payload: any): string | null {
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.value?.metadata?.phone_number_id) return String(change.value.metadata.phone_number_id);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!chatWhatsappActivo()) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const esperado = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (mode === "subscribe" && esperado && token === esperado && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "verificación inválida" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!chatWhatsappActivo()) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  const rawBody = await req.text();
  if (!verificarFirmaMeta(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  const phoneId = phoneNumberId(payload);
  if (!phoneId) return NextResponse.json({ ok: true, procesados: 0, estados: 0 });
  const canal = await prisma.canalWhatsapp.findUnique({ where: { phoneNumberId: phoneId } });
  if (!canal?.activo) return NextResponse.json({ ok: true, procesados: 0, estados: 0 });

  const estados = normalizarEstadosMeta(payload);
  await actualizarEstadosMensajes(estados);
  let procesados = 0;
  for (const mensaje of normalizarMensajesMeta(payload)) {
    const resultado = await ingestarMensajeEntrante(mensaje, canal.id);
    void procesarEntrante(resultado, canal);
    procesados += 1;
  }
  return NextResponse.json({ ok: true, procesados, estados: estados.length });
}
