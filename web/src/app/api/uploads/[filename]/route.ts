import { NextRequest, NextResponse } from "next/server";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tieneAccesoDiligencia } from "@/lib/services/diligencias";

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  // Defensa en profundidad: además del middleware, exigimos sesión aquí.
  // Estos archivos contienen documentos legales y comprobantes confidenciales.
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo permite nombres seguros (sin path traversal)
  const name = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  const ruta = `/api/uploads/${name}`;
  const [doc, comprobante] = await Promise.all([
    prisma.documento.findFirst({
      where: { linkDrive: ruta },
      select: { expediente: { select: { abogadoResponsableId: true } } },
    }),
    prisma.diligenciaComprobante.findFirst({ where: { ruta }, select: { diligenciaId: true, mimeType: true } }),
  ]);
  const autorizado = doc
    ? session.user.rol === "admin" || doc.expediente.abogadoResponsableId === session.user.id
    : comprobante
    ? await tieneAccesoDiligencia(comprobante.diligenciaId, { id: session.user.id, rol: session.user.rol })
    : false;
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const filepath = join(process.cwd(), "uploads", name);
  try {
    const archivo = await stat(filepath);
    const stream = createReadStream(filepath);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": comprobante?.mimeType ?? "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Content-Length": String(archivo.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
}
