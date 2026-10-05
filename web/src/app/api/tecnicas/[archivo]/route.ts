import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rutaArchivo } from "@/lib/tecnicas";

const TIPOS: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Los videos se sirven por aquí y no desde public/ porque el middleware deja pasar
// sin sesión cualquier ruta con extensión. Soporta Range: sin él el navegador no
// puede adelantar el video (y Safari ni lo reproduce).
export async function GET(req: NextRequest, { params }: { params: { archivo: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const nombre = decodeURIComponent(params.archivo);
  const ruta = await rutaArchivo(nombre);
  if (!ruta) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const { size } = await stat(ruta);
  const tipo = TIPOS[nombre.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
  const rango = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);

  let inicio = 0;
  let fin = size - 1;
  if (rango) {
    if (rango[1]) {
      inicio = Number(rango[1]);
      if (rango[2]) fin = Math.min(Number(rango[2]), size - 1);
    } else if (rango[2]) {
      inicio = Math.max(size - Number(rango[2]), 0); // "bytes=-500": los últimos 500
    }
    if (inicio > fin) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
  }

  const stream = Readable.toWeb(createReadStream(ruta, { start: inicio, end: fin })) as ReadableStream;
  return new NextResponse(stream, {
    status: rango ? 206 : 200,
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(fin - inicio + 1),
      "Accept-Ranges": "bytes",
      ...(rango && { "Content-Range": `bytes ${inicio}-${fin}/${size}` }),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
