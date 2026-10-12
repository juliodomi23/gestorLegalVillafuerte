import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChat } from "@/lib/chat/api";
import { crearProveedorCloudApi } from "@/lib/channel/cloudapi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const canalId = req.nextUrl.searchParams.get("canalId") || "";
  const canal = await prisma.canalWhatsapp.findFirst({ where: { id: canalId, activo: true } });
  if (!canal) return NextResponse.json({ error: "canal inexistente" }, { status: 404 });
  try {
    const provider = crearProveedorCloudApi(canal.phoneNumberId, canal.wabaId, canal.config as any);
    return NextResponse.json({ plantillas: await provider.listarPlantillas() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron cargar las plantillas" }, { status: 502 });
  }
}
