// Lo que pasa DESPUÉS de guardar un mensaje entrante: descargar su archivo y avisar a n8n.
import { prisma } from "@/lib/prisma";
import { crearProveedorCloudApi } from "@/lib/channel/cloudapi";
import { emitirEventoSeguro } from "@/lib/bot/webhooks";
import { payloadConversacion, payloadMensaje } from "@/lib/bot/serializar";
import { cargarConversacion } from "./operaciones";
import { extensionPermitida, guardarMedia } from "./media";
import type { ResultadoIngesta } from "./servicio";

type Canal = { phoneNumberId: string; wabaId: string; config: unknown };

async function descargarArchivo(mensajeId: string, mediaId: string, canal: Canal) {
  const proveedor = crearProveedorCloudApi(canal.phoneNumberId, canal.wabaId, canal.config as any);
  const descarga = await proveedor.descargarMedia(mediaId);
  if (!descarga.ok) {
    await prisma.mensaje.update({ where: { id: mensajeId }, data: { errorDetalle: "No se pudo descargar el archivo" } });
    return;
  }
  if (!extensionPermitida(descarga.mime)) {
    await prisma.mensaje.update({ where: { id: mensajeId }, data: { errorDetalle: "Tipo de archivo no permitido" } });
    return;
  }
  try {
    const guardado = await guardarMedia(descarga.buffer, descarga.mime);
    await prisma.mensaje.update({
      where: { id: mensajeId },
      data: { mediaRuta: guardado.ruta, mediaMime: guardado.mime, mediaTamano: BigInt(guardado.tamano) },
    });
  } catch (error) {
    await prisma.mensaje.update({
      where: { id: mensajeId },
      data: { errorDetalle: error instanceof Error ? error.message.slice(0, 120) : "Archivo no permitido" },
    });
  }
}

// Nunca lanza: el mensaje ya está guardado y Meta no debe reintentar por un fallo de aquí.
export async function procesarEntrante(resultado: ResultadoIngesta, canal: Canal) {
  if (resultado.duplicado) return;
  try {
    if (resultado.mediaId) await descargarArchivo(resultado.mensajeId, resultado.mediaId, canal);

    const [conv, mensaje] = await Promise.all([
      cargarConversacion({ id: resultado.conversacionId }),
      prisma.mensaje.findUnique({ where: { id: resultado.mensajeId } }),
    ]);
    if (!conv || !mensaje) return;
    if (resultado.conversacionCreada) {
      await emitirEventoSeguro("conversation_created", payloadConversacion("conversation_created", conv));
    } else if (resultado.estadoCambio) {
      await emitirEventoSeguro(
        "conversation_status_changed",
        payloadConversacion("conversation_status_changed", conv, { status: { current_value: "open" } }),
      );
    }
    await emitirEventoSeguro("message_created", payloadMensaje("message_created", mensaje, conv), mensaje.id);
  } catch (error) {
    console.error("[chat] no se pudo publicar el mensaje entrante", error instanceof Error ? error.message : "");
  }
}
