import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";

export const dynamic = "force-dynamic";

const COLOR = /^#[0-9a-fA-F]{6}$/;

// Renombrar, recolorear o mover de lugar. La clave (lo que hace que se mueva sola) no se toca.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const permiso = await requerirChatAdmin();
  if ("error" in permiso) return permiso.error;
  const body = await req.json().catch(() => ({}));
  const datos: { nombre?: string; color?: string; orden?: number } = {};
  if (typeof body.nombre === "string") {
    const nombre = body.nombre.trim().slice(0, 40);
    if (!nombre) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 });
    datos.nombre = nombre;
  }
  if (typeof body.color === "string") {
    if (!COLOR.test(body.color)) return NextResponse.json({ error: "Color inválido" }, { status: 400 });
    datos.color = body.color;
  }
  if (body.orden !== undefined) {
    const orden = Number(body.orden);
    if (!Number.isInteger(orden) || orden < 1 || orden > 999) return NextResponse.json({ error: "Orden inválido" }, { status: 400 });
    datos.orden = orden;
  }
  const resultado = await prisma.embudoEtapa.updateMany({ where: { id: params.id }, data: datos });
  if (!resultado.count) return NextResponse.json({ error: "etapa inexistente" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Solo se borra una etapa vacía y propia del despacho: las que mueve el sistema se renombran, no se quitan.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const permiso = await requerirChatAdmin();
  if ("error" in permiso) return permiso.error;
  const etapa = await prisma.embudoEtapa.findUnique({ where: { id: params.id }, select: { clave: true } });
  if (!etapa) return NextResponse.json({ error: "etapa inexistente" }, { status: 404 });
  if (etapa.clave) {
    return NextResponse.json({ error: "Esta etapa la usa el sistema para moverse sola: puedes renombrarla pero no quitarla" }, { status: 409 });
  }
  const tarjetas = await prisma.conversacion.count({ where: { etapaId: params.id } });
  if (tarjetas > 0) {
    return NextResponse.json({ error: `La etapa tiene ${tarjetas} conversación(es): muévelas antes de quitarla` }, { status: 409 });
  }
  await prisma.embudoEtapa.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
