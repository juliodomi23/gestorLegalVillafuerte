// Técnicas para asesoras: lecciones en video.
//
// Las lecciones son los archivos de uploads/tecnicas/ (volumen gestorlegal_uploads),
// no viven en la BD ni en el repo: cada despacho trae sus propios videos.
//   "3 - Solución y empatía.mp4"  → lección 3, título "Solución y empatía"
//   "3 - Solución y empatía.jpeg" → apunte (pizarrón) que se muestra junto al video
// El orden es el del nombre, con números naturales (2 antes que 10).
//
// ponytail: carpeta en vez de tabla `lecciones`. Agregar una lección = copiar un
// archivo. Si algún día el admin las sube desde la app, ahí sí hace falta tabla.
// Ojo: renombrar un archivo cambia su id y "pierde" quién ya lo vio.

import { readdir } from "fs/promises";
import { join } from "path";

const DIR = join(process.cwd(), "uploads", "tecnicas");
const VIDEO = /\.(mp4|webm)$/i;
const IMAGEN = /\.(jpe?g|png|webp)$/i;

export type Leccion = { id: string; numero: string; titulo: string; video: string; apunte: string | null };

const sinExtension = (archivo: string) => archivo.replace(/\.[^.]+$/, "");

async function archivos(): Promise<string[]> {
  return readdir(DIR).catch(() => []);
}

export async function listarLecciones(): Promise<Leccion[]> {
  const todos = await archivos();
  return todos
    .filter((a) => VIDEO.test(a))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
    .map((video, i) => {
      const id = sinExtension(video);
      const apunte = todos.find((a) => IMAGEN.test(a) && sinExtension(a) === id) ?? null;
      const [, numero = String(i + 1), resto = id] = id.match(/^(\d+)\s*[-_.]?\s*(.*)$/) ?? [];
      return { id, numero, titulo: resto.trim() || `Lección ${numero}`, video, apunte };
    });
}

/** Ruta en disco solo si el nombre es exactamente uno de los archivos de la carpeta (sin path traversal). */
export async function rutaArchivo(nombre: string): Promise<string | null> {
  return (await archivos()).includes(nombre) ? join(DIR, nombre) : null;
}
