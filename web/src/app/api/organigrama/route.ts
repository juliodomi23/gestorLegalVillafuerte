import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ORGANIGRAMA_DIR, listarOrganigramas } from "@/lib/organigrama";

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Se busca el nombre en la lista real de la carpeta: nada de rutas armadas con lo que manda el cliente.
  const pedido = req.nextUrl.searchParams.get("archivo") ?? "";
  const existente = (await listarOrganigramas()).find((o) => o.archivo === pedido);
  if (!existente) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const buffer = await readFile(join(ORGANIGRAMA_DIR, existente.archivo));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(existente.archivo)}`,
      "Cache-Control": "private, no-cache",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const file = (await req.formData()).get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Máximo 25 MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 4).toString("ascii") !== "%PDF") {
    return NextResponse.json({ error: "El archivo no es un PDF válido" }, { status: 400 });
  }

  // Subir otro PDF con el mismo nombre lo reemplaza (así se actualiza un organigrama).
  const nombre = file.name.replace(/[\\/:*?"<>|]/g, "_").replace(/^\.+/, "");
  await listarOrganigramas();
  await writeFile(join(ORGANIGRAMA_DIR, nombre), buffer);
  return NextResponse.redirect(new URL("/organigrama", req.url), 303);
}
