import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";

export const dynamic = "force-dynamic";

// Revocar no borra: el token queda inactivo y en la bitácora.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const resultado = await prisma.tokenIntegracion.updateMany({
    where: { id: params.id, revocadoEn: null },
    data: { activo: false, revocadoEn: new Date() },
  });
  if (!resultado.count) return NextResponse.json({ error: "token inexistente o ya revocado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
