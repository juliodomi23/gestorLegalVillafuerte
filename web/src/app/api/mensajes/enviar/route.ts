import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";
import { crearProveedorCloudApi } from "@/lib/channel/cloudapi";
import { estadoVentana } from "@/lib/meta/ventana";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const body = await req.json().catch(() => ({}));
  const conversacionId = String(body.conversacionId || "");
  const texto = String(body.texto || "").trim();
  const plantilla =
    typeof body.plantilla?.name === "string" && typeof body.plantilla?.language === "string"
      ? {
          name: body.plantilla.name,
          language: body.plantilla.language,
          variables: Array.isArray(body.plantilla.variables) ? body.plantilla.variables.map(String) : [],
          vistaPrevia: String(body.plantilla.vistaPrevia || `[Plantilla ${body.plantilla.name}]`).slice(0, 4096),
        }
      : null;
  if (!conversacionId || (!texto && !plantilla)) {
    return NextResponse.json({ error: "faltan campos" }, { status: 400 });
  }
  const conversacion = await prisma.conversacion.findUnique({
    where: { id: conversacionId },
    include: { canal: true },
  });
  if (!conversacion?.canal.activo) {
    return NextResponse.json({ error: "conversación o canal inexistente" }, { status: 404 });
  }
  if (!plantilla) {
    const ultimoEntrante = await prisma.mensaje.findFirst({
      where: { conversacionId, direccion: "entrante" },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });
    if (!estadoVentana(ultimoEntrante?.timestamp).abierta) {
      return NextResponse.json({ error: "Fuera de la ventana de 24 h; usa una plantilla aprobada.", ventanaCerrada: true }, { status: 400 });
    }
  }
  const provider = crearProveedorCloudApi(
    conversacion.canal.phoneNumberId,
    conversacion.canal.wabaId,
    conversacion.canal.config as any,
  );
  const envio = plantilla
    ? await provider.enviarPlantilla(conversacion.telefono, plantilla, plantilla.variables)
    : await provider.enviarTexto(conversacion.telefono, texto);
  const mensaje = await prisma.mensaje.create({
    data: {
      conversacionId,
      direccion: "saliente",
      tipo: plantilla ? "plantilla" : "texto",
      contenido: plantilla?.vistaPrevia || texto,
      status: envio.ok ? "enviado" : "fallido",
      errorDetalle: envio.ok ? null : envio.error,
      waMessageId: envio.waMessageId,
      enviadoPor: acceso.sesion.id,
    },
  });
  await prisma.conversacion.update({ where: { id: conversacionId }, data: { ultimoMensajeAt: new Date() } });
  return NextResponse.json({ ok: envio.ok, mensaje, ...(envio.ok ? {} : { error: envio.error }) }, { status: envio.ok ? 200 : 502 });
}
