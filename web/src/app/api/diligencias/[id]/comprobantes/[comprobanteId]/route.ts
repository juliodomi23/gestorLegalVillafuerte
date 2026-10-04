import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { basename, join } from "path";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { puedeEditarDiligencia } from "@/lib/services/diligencias";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; comprobanteId: string } }
) {
  const sesion = await requireSession();
  if (!(await puedeEditarDiligencia(params.id, sesion))) {
    return NextResponse.json({ error: "El periodo de edición de esta diligencia ya cerró" }, { status: 403 });
  }
  const comprobante = await prisma.diligenciaComprobante.findFirst({
    where: { id: params.comprobanteId, diligenciaId: params.id },
  });
  if (!comprobante) return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });

  await prisma.diligenciaComprobante.delete({ where: { id: comprobante.id } });
  const filename = basename(comprobante.ruta);
  await unlink(join(process.cwd(), "uploads", filename)).catch(() => {});
  return NextResponse.json({ ok: true });
}
