import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { enviarMensajeChat } from "@/lib/chat/envio";
import { mensajeVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const body = await req.json().catch(() => ({}));
  const conversacionId = String(body.conversacionId || "");

  // Solo se puede escribir en una conversación que la persona puede ver.
  const visible = await prisma.conversacion.findFirst({
    where: { AND: [{ id: conversacionId }, filtroConversaciones(permiso.acceso)] },
    select: { id: true },
  });
  if (!visible) return NextResponse.json({ ok: false, error: "conversación inexistente" }, { status: 404 });

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
    conversacionId,
    texto: String(body.texto || ""),
    privado: body.privado === true,
    plantilla,
    enviadoPor: permiso.sesion.id,
  });
  if (!resultado.ok) {
    const ventanaCerrada = "ventanaCerrada" in resultado && resultado.ventanaCerrada;
    return NextResponse.json(
      { ok: false, error: resultado.error, ...(ventanaCerrada ? { ventanaCerrada: true } : {}) },
      { status: resultado.status },
    );
  }
  return NextResponse.json({ ok: true, mensaje: mensajeVista({ ...resultado.mensaje, usuario: { nombre: permiso.sesion.nombre } }) });
}
