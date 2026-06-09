import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const UPLOADS_DIR = join(process.cwd(), "uploads");

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Solo PDF" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Máximo 20 MB" }, { status: 400 });

  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const bytes = await file.arrayBuffer();
  await writeFile(join(UPLOADS_DIR, filename), Buffer.from(bytes));

  const doc = await prisma.documento.create({
    data: {
      expedienteId: params.id,
      nombre: file.name,
      tipo: "pdf",
      linkDrive: `/api/uploads/${filename}`,
      subidoPor: session?.user ? undefined : undefined,
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
