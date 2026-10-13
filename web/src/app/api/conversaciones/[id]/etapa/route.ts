import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { moverEtapa, resolverEtapa } from "@/lib/chat/embudo";

export const dynamic = "force-dynamic";

// Mover una tarjeta a mano. Solo conversaciones que la persona puede ver.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const visible = await prisma.conversacion.findFirst({
    where: { AND: [{ id: params.id }, filtroConversaciones(permiso.acceso)] },
    select: { id: true },
  });
  if (!visible) return NextResponse.json({ error: "conversación inexistente" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const etapa = await resolverEtapa(body.etapaId);
  if (!etapa) return NextResponse.json({ error: "etapa inexistente" }, { status: 400 });
  const resultado = await moverEtapa(params.id, etapa.id, { origen: "usuario", usuarioId: permiso.acceso.usuarioId });
  return NextResponse.json({ ok: true, cambio: resultado.cambio });
}
