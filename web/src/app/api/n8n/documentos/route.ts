import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Body = {
  expedienteId: string;
  nombre: string;
  linkDrive: string;
  tipo?: string;
};

// POST /api/n8n/documentos
// El bot llama esto después de subir un PDF a Drive para ligarlo al expediente.
// Body: { expedienteId, nombre, linkDrive, tipo? }
export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();

  const r = await leerBody<Body>(req, ["expedienteId", "nombre", "linkDrive"]);
  if ("error" in r) return r.error;

  const { expedienteId, nombre, linkDrive, tipo } = r.data;

  const expedienteExiste = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    select: { id: true },
  });
  if (!expedienteExiste) return fail("Expediente no encontrado", 404);

  const doc = await prisma.documento.create({
    data: {
      expedienteId,
      nombre: nombre.trim(),
      tipo: tipo ?? "drive",
      linkDrive: linkDrive.trim(),
    },
  });

  return ok({
    id: doc.id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    linkDrive: doc.linkDrive,
    creadoEn: doc.creadoEn,
  }, 201);
}
