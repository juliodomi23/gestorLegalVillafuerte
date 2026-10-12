import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { variablesDePlantillaApi } from "@/lib/bot/puro";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conConversacionBot } from "@/lib/bot/rutas";
import { atributos, etiquetasDe, mensajeJson } from "@/lib/bot/serializar";
import { enviarMensajeChat } from "@/lib/chat/envio";

export const dynamic = "force-dynamic";

type Params = { params: { accountId: string; conversationId: string } };

export async function GET(req: NextRequest, { params }: Params) {
  return conConversacionBot(req, params, "mensajes_listar", async (conv) => {
    const recientes = await prisma.mensaje.findMany({
      where: { conversacionId: conv.id },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return json({
      meta: {
        labels: etiquetasDe(conv),
        additional_attributes: {},
        contact_inbox: {
          contact_id: Number(conv.contactoWhatsapp?.numeroCompat),
          source_id: conv.contactoWhatsapp?.sourceId,
        },
        custom_attributes: atributos(conv.atributos),
        agent_last_seen_at: null,
      },
      payload: recientes.reverse().map((mensaje) => mensajeJson(mensaje, conv)),
    });
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  return conConversacionBot(req, params, "mensaje_enviar", async (conv, contexto) => {
    const body = await leerJson(req);
    const contenido = typeof body.content === "string" ? body.content : "";
    const tipo = body.message_type === undefined ? "outgoing" : String(body.message_type);
    if (tipo !== "outgoing" && tipo !== "1") return invalido("solo se admiten mensajes outgoing");
    const privado = body.private === true || body.private === "true";

    let plantilla = null;
    const tp = body.template_params as Record<string, unknown> | undefined;
    if (!privado && tp && typeof tp === "object") {
      const variables = variablesDePlantillaApi(tp.processed_params);
      if (!tp.name || variables === null) return invalido("template_params inválido");
      plantilla = {
        name: String(tp.name),
        language: String(tp.language || "es_MX"),
        variables,
        vistaPrevia: (contenido.trim() || `[Plantilla ${String(tp.name)}]`).slice(0, 4096),
      };
    }
    if (!contenido.trim() && !plantilla) return invalido("content requerido");
    contexto.accion = privado ? "nota_privada" : plantilla ? "plantilla_enviar" : "mensaje_enviar";

    const resultado = await enviarMensajeChat({ conversacionId: conv.id, texto: contenido, privado, plantilla });
    if (!resultado.ok) {
      const ventana = "ventanaCerrada" in resultado && resultado.ventanaCerrada;
      return json(
        { error: resultado.error, message: resultado.error, ...(ventana ? { ventana_cerrada: true } : {}) },
        resultado.status === 400 ? 422 : resultado.status,
      );
    }
    return json(mensajeJson(resultado.mensaje, conv));
  });
}
