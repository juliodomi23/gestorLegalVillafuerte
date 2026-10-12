import { NextRequest, NextResponse } from "next/server";
import { requerirChatAdmin } from "@/lib/chat/api";
import { enviarMensajeChat } from "@/lib/chat/envio";
import { mensajeVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const body = await req.json().catch(() => ({}));
  const plantilla =
    typeof body.plantilla?.name === "string" && typeof body.plantilla?.language === "string"
      ? {
          name: body.plantilla.name,
          language: body.plantilla.language,
          variables: Array.isArray(body.plantilla.variables) ? body.plantilla.variables.map(String) : [],
          vistaPrevia: String(body.plantilla.vistaPrevia || `[Plantilla ${body.plantilla.name}]`).slice(0, 4096),
        }
      : null;
  const resultado = await enviarMensajeChat({
    conversacionId: String(body.conversacionId || ""),
    texto: String(body.texto || ""),
    privado: body.privado === true,
    plantilla,
    enviadoPor: acceso.sesion.id,
  });
  if (!resultado.ok) {
    const ventanaCerrada = "ventanaCerrada" in resultado && resultado.ventanaCerrada;
    return NextResponse.json(
      { ok: false, error: resultado.error, ...(ventanaCerrada ? { ventanaCerrada: true } : {}) },
      { status: resultado.status },
    );
  }
  return NextResponse.json({ ok: true, mensaje: mensajeVista(resultado.mensaje) });
}
