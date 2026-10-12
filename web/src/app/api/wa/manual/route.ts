import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";
import { cifrarTokenMeta } from "@/lib/meta/credentials";
import { consultarNumeroMeta, suscribirAppMeta } from "@/lib/channel/cloudapi";

export const dynamic = "force-dynamic";

const ID_META = /^\d{5,25}$/;

export async function GET() {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  const canales = await prisma.canalWhatsapp.findMany({
    orderBy: { creadoEn: "desc" },
    select: { id: true, nombre: true, telefono: true, estado: true, activo: true },
  });
  return NextResponse.json({ callbackUrl: base ? `${base}/api/meta/webhook` : null, canales });
}

export async function POST(req: NextRequest) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  if (!process.env.META_APP_SECRET?.trim() || !process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()) {
    return NextResponse.json({ error: "Faltan META_APP_SECRET o META_WEBHOOK_VERIFY_TOKEN en el entorno" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const wabaId = String(body.wabaId || "").trim();
  const phoneNumberId = String(body.phoneNumberId || "").trim();
  const token = String(body.token || "").trim();
  const nombre = String(body.nombre || "").trim().slice(0, 80);
  if (!ID_META.test(wabaId) || !ID_META.test(phoneNumberId)) {
    return NextResponse.json({ error: "WABA ID y Phone Number ID deben ser numéricos" }, { status: 400 });
  }
  if (token.length < 20 || /\s/.test(token)) {
    return NextResponse.json({ error: "El token permanente no parece válido" }, { status: 400 });
  }
  try {
    const phone = await consultarNumeroMeta(wabaId, phoneNumberId, token);
    await suscribirAppMeta(wabaId, token);
    const canal = await prisma.canalWhatsapp.upsert({
      where: { phoneNumberId },
      update: {
        nombre: nombre || phone.verified_name || "WhatsApp Oficial",
        telefono: phone.display_phone_number || null,
        wabaId,
        config: { tokenEncrypted: cifrarTokenMeta(token) },
        estado: "conectado",
        activo: true,
      },
      create: {
        nombre: nombre || phone.verified_name || "WhatsApp Oficial",
        telefono: phone.display_phone_number || null,
        phoneNumberId,
        wabaId,
        config: { tokenEncrypted: cifrarTokenMeta(token) },
        estado: "conectado",
        activo: true,
      },
      select: { id: true, nombre: true, telefono: true, estado: true, activo: true },
    });
    return NextResponse.json({ ok: true, canal });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Meta rechazó los datos" }, { status: 502 });
  }
}
