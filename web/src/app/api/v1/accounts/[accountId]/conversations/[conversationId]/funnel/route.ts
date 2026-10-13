import { NextRequest } from "next/server";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conConversacionBot } from "@/lib/bot/rutas";
import { listarEtapas, moverEtapa, resolverEtapa } from "@/lib/chat/embudo";

export const dynamic = "force-dynamic";

type Params = { params: { accountId: string; conversationId: string } };

const vista = (e: { id: string; clave: string | null; nombre: string }) => ({ id: e.id, key: e.clave, name: e.nombre });

export async function GET(req: NextRequest, { params }: Params) {
  return conConversacionBot(req, params, "embudo_leer", async (conv) => {
    const etapas = await listarEtapas();
    return json({ stage: conv.etapa ? vista(conv.etapa) : null, stages: etapas.map(vista) });
  });
}

// { etapa: "Agendó cita" | "agendo_cita" | <id> }. Si no existe responde con la lista válida.
export async function POST(req: NextRequest, { params }: Params) {
  return conConversacionBot(req, params, "embudo_mover", async (conv) => {
    const body = await leerJson(req);
    const etapa = await resolverEtapa(body.etapa ?? body.stage);
    if (!etapa) {
      const etapas = await listarEtapas();
      return json({ error: "etapa inexistente", message: "etapa inexistente", stages: etapas.map(vista) }, 422);
    }
    const resultado = await moverEtapa(conv.id, etapa.id, { origen: "bot", detalle: "Movida por el bot" });
    return json({ ok: true, changed: resultado.cambio, stage: vista(etapa) });
  });
}
