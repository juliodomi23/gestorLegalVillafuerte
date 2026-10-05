import { NextRequest, NextResponse } from "next/server";
import { open, stat } from "fs/promises";
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

// Lee el archivo por pedazos solo cuando el navegador pide más (pull), y lo cierra
// si cancela la descarga — cosa que hace cada vez que adelantan el video.
// No usar Readable.toWeb(createReadStream()): truena con "Controller is already
// closed" justo en esa cancelación.
async function leerRango(ruta: string, inicio: number, fin: number): Promise<ReadableStream<Uint8Array>> {
  const archivo = await open(ruta);
  let pos = inicio;
  return new ReadableStream({
    async pull(controller) {
      const largo = Math.min(256 * 1024, fin + 1 - pos);
      const { bytesRead, buffer } = largo > 0 ? await archivo.read(Buffer.alloc(largo), 0, largo, pos) : { bytesRead: 0, buffer: null };
      if (!bytesRead || !buffer) {
        await archivo.close();
        controller.close();
        return;
      }
      pos += bytesRead;
      controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead));
    },
    cancel: () => archivo.close(),
  });
}

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

  return new NextResponse(await leerRango(ruta, inicio, fin), {
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
