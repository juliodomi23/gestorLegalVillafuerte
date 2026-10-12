import type { NextRequest } from "next/server";
import { cargarConversacion } from "@/lib/chat/operaciones";
import type { ConversacionCompleta } from "./serializar";
import { conBot, type ContextoBot } from "./auth";
import { parsearIdNumerico } from "./puro";
import { noEncontrado } from "./respuestas";

export function conConversacionBot(
  req: NextRequest,
  params: { accountId: string; conversationId: string },
  accion: string,
  handler: (conv: ConversacionCompleta, contexto: ContextoBot) => Promise<Response>,
) {
  return conBot(req, params, accion, async (contexto) => {
    const numero = parsearIdNumerico(params.conversationId);
    if (numero === null) return noEncontrado("conversación inexistente");
    const conv = await cargarConversacion({ numeroCompat: numero });
    if (!conv) return noEncontrado("conversación inexistente");
    contexto.conversacionId = conv.id;
    return handler(conv, contexto);
  });
}
