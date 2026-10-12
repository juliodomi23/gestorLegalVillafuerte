import { prisma } from "@/lib/prisma";
import { crearProveedorCloudApi } from "@/lib/channel/cloudapi";
import { estadoVentana } from "@/lib/meta/ventana";

export type EntradaEnvio = {
  conversacionId: string;
  texto?: string;
  privado?: boolean;
  plantilla?: { name: string; language: string; variables: string[]; vistaPrevia: string } | null;
  enviadoPor?: string | null;
};

// Una nota privada se guarda y no sale a WhatsApp. Un texto solo sale dentro de las 24 h.
export async function enviarMensajeChat(entrada: EntradaEnvio) {
  const texto = (entrada.texto ?? "").trim();
  const plantilla = entrada.plantilla ?? null;
  if (!texto && !plantilla) return { ok: false as const, status: 400, error: "faltan campos" };

  const conversacion = await prisma.conversacion.findUnique({
    where: { id: entrada.conversacionId },
    include: { canal: true },
  });
  if (!conversacion?.canal.activo) {
    return { ok: false as const, status: 404, error: "conversación o canal inexistente" };
  }

  if (entrada.privado) {
    const nota = await prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        direccion: "saliente",
        tipo: "texto",
        contenido: texto,
        status: "enviado",
        privado: true,
        enviadoPor: entrada.enviadoPor ?? null,
      },
    });
    return { ok: true as const, status: 200, mensaje: nota, conversacion };
  }

  if (!plantilla) {
    const ultimoEntrante = await prisma.mensaje.findFirst({
      where: { conversacionId: conversacion.id, direccion: "entrante" },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });
    if (!estadoVentana(ultimoEntrante?.timestamp).abierta) {
      return {
        ok: false as const,
        status: 400,
        error: "Fuera de la ventana de 24 h; usa una plantilla aprobada.",
        ventanaCerrada: true,
      };
    }
  }

  const proveedor = crearProveedorCloudApi(conversacion.canal.phoneNumberId, conversacion.canal.wabaId, conversacion.canal.config as any);
  const envio = plantilla
    ? await proveedor.enviarPlantilla(conversacion.telefono, plantilla, plantilla.variables)
    : await proveedor.enviarTexto(conversacion.telefono, texto);
  const mensaje = await prisma.mensaje.create({
    data: {
      conversacionId: conversacion.id,
      direccion: "saliente",
      tipo: plantilla ? "plantilla" : "texto",
      contenido: plantilla?.vistaPrevia || texto,
      status: envio.ok ? "enviado" : "fallido",
      errorDetalle: envio.ok ? null : envio.error,
      waMessageId: envio.waMessageId,
      enviadoPor: entrada.enviadoPor ?? null,
    },
  });
  await prisma.conversacion.update({ where: { id: conversacion.id }, data: { ultimoMensajeAt: new Date() } });
  if (!envio.ok) return { ok: false as const, status: 502, error: envio.error || "Meta rechazó el mensaje", mensaje };
  return { ok: true as const, status: 200, mensaje, conversacion };
}
