import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  // Defensa en profundidad: además del middleware, exigimos sesión aquí.
  // Estos PDFs son documentos legales confidenciales.
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo permite nombres seguros (sin path traversal)
  const name = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  // El PDF pertenece a un expediente: solo su dueño (o un admin) puede descargarlo,
  // aunque conozca o adivine el nombre de archivo.
  if (session.user.rol !== "admin") {
    const doc = await prisma.documento.findFirst({
      where: { linkDrive: `/api/uploads/${name}` },
      select: { expediente: { select: { abogadoResponsableId: true } } },
    });
    if (!doc || doc.expediente.abogadoResponsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }
  const filepath = join(process.cwd(), "uploads", name);
  try {
    const data = await readFile(filepath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
}
