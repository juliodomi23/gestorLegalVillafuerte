import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { puedeEditarDiligencia, tieneAccesoDiligencia } from "@/lib/services/diligencias";

const UPLOADS_DIR = join(process.cwd(), "uploads");
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function tipoReal(buffer: Buffer): { mimeType: string; extension: string } | null {
  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return { mimeType: "application/pdf", extension: "pdf" };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await requireSession();
  if (!(await tieneAccesoDiligencia(params.id, sesion))) {
    return NextResponse.json({ error: "Sin permiso sobre esta diligencia" }, { status: 403 });
  }
  const comprobantes = await prisma.diligenciaComprobante.findMany({
    where: { diligenciaId: params.id },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(comprobantes);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await requireSession();
  if (!(await puedeEditarDiligencia(params.id, sesion))) {
    return NextResponse.json({ error: "El periodo de edición de esta diligencia ya cerró" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona un archivo" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const tipo = tipoReal(buffer);
  if (!tipo) {
    return NextResponse.json({ error: "Solo se permiten JPG, PNG, WEBP o PDF" }, { status: 400 });
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `diligencia-${params.id}-${randomUUID()}.${tipo.extension}`;
  await writeFile(join(UPLOADS_DIR, filename), buffer);

  const comprobante = await prisma.diligenciaComprobante.create({
    data: {
      diligenciaId: params.id,
      nombre: file.name.slice(0, 255),
      mimeType: tipo.mimeType,
      ruta: `/api/uploads/${filename}`,
      subidoPor: sesion.id,
    },
  });

  return NextResponse.json({
    id: comprobante.id,
    nombre: comprobante.nombre,
    mimeType: comprobante.mimeType,
    ruta: comprobante.ruta,
  });
}
