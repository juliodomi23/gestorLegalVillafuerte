import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const UPLOADS_DIR = join(process.cwd(), "uploads");

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const docs = await prisma.documento.findMany({
    where: { expedienteId: params.id },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(docs.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    linkDrive: d.linkDrive,
    fecha: d.creadoEn.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }),
  })));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Solo PDF" }, { status: 400 });
  if (file.size > 500 * 1024 * 1024) return NextResponse.json({ error: "Máximo 500 MB" }, { status: 400 });

  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const bytes = await file.arrayBuffer();
  // Verifica los magic bytes del PDF (%PDF), no solo el Content-Type declarado.
  const buffer = Buffer.from(bytes);
  if (buffer.subarray(0, 4).toString("ascii") !== "%PDF") {
    return NextResponse.json({ error: "El archivo no es un PDF válido" }, { status: 400 });
  }
  await writeFile(join(UPLOADS_DIR, filename), buffer);

  const actuacionId = (formData.get("actuacionId") as string | null) || null;

  const doc = await prisma.documento.create({
    data: {
      expedienteId: params.id,
      actuacionId,
      nombre: file.name,
      tipo: "pdf",
      linkDrive: `/api/uploads/${filename}`,
      subidoPor: session?.user?.id ?? null,
    },
  });

  return NextResponse.json({
    id: doc.id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    linkDrive: doc.linkDrive,
    fecha: doc.creadoEn.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }),
  });
}
