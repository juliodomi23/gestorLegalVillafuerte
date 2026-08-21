import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const UPLOADS_DIR = join(process.cwd(), "uploads");
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // un PDF legal no debería pasar de esto

// Un expediente es privado: solo su abogado responsable (o un admin) puede ver/subir documentos.
async function tieneAccesoExpediente(expedienteId: string, session: { user: { id: string; rol: string } }) {
  if (session.user.rol === "admin") return true;
  const e = await prisma.expediente.findUnique({ where: { id: expedienteId }, select: { abogadoResponsableId: true } });
  return !!e && e.abogadoResponsableId === session.user.id;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await tieneAccesoExpediente(params.id, session))) {
    return NextResponse.json({ error: "Sin permiso sobre este expediente" }, { status: 403 });
  }

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
  if (!(await tieneAccesoExpediente(params.id, session))) {
    return NextResponse.json({ error: "Sin permiso sobre este expediente" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Solo PDF" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Máximo 25 MB" }, { status: 400 });

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
  // "contrato" lo usa la sección de Contratos para distinguirlos del resto de PDFs.
  const tipo = formData.get("tipo") === "contrato" ? "contrato" : "pdf";

  const doc = await prisma.documento.create({
    data: {
      expedienteId: params.id,
      actuacionId,
      nombre: file.name,
      tipo,
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
