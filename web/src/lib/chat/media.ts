import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";

export const MEDIA_MAX_BYTES = 16 * 1024 * 1024;

const EXTENSION_POR_MIME: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

// Lo que el navegador puede mostrar en línea; el resto se descarga como adjunto.
const MOSTRABLES = new Set(["image/jpeg", "image/png", "image/webp", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac"]);

export function mimeBase(mime: string | null | undefined): string {
  return String(mime ?? "").split(";")[0].trim().toLowerCase();
}

export function extensionPermitida(mime: string | null | undefined): string | null {
  return EXTENSION_POR_MIME[mimeBase(mime)] ?? null;
}

export function sePuedeMostrarEnLinea(mime: string | null | undefined): boolean {
  return MOSTRABLES.has(mimeBase(mime));
}

function directorioBase(): string {
  return process.env.CHAT_MEDIA_DIR?.trim() || join(process.cwd(), "uploads", "chat");
}

export async function guardarMedia(buffer: Buffer, mime: string) {
  const extension = extensionPermitida(mime);
  if (!extension) throw new Error("tipo de archivo no permitido");
  if (buffer.length === 0 || buffer.length > MEDIA_MAX_BYTES) throw new Error("tamaño de archivo no permitido");
  const ahora = new Date();
  const ruta = `${ahora.getUTCFullYear()}/${String(ahora.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${extension}`;
  const destino = join(directorioBase(), ruta);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, buffer, { flag: "wx" });
  return { ruta, mime: mimeBase(mime), tamano: buffer.length };
}

export async function leerMedia(ruta: string): Promise<Buffer> {
  const base = normalize(directorioBase());
  const destino = normalize(join(base, ruta));
  if (!destino.startsWith(base + sep)) throw new Error("ruta de archivo inválida");
  return readFile(destino);
}

export function respuestaDeArchivo(buffer: Buffer, mime: string | null, nombre: string | null) {
  const tipo = mimeBase(mime) || "application/octet-stream";
  const seguro = (nombre || "archivo").replace(/[^\w.\- ]+/g, "_").slice(0, 80);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${sePuedeMostrarEnLinea(tipo) ? "inline" : "attachment"}; filename="${seguro}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
