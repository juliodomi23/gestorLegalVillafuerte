import { readdir, mkdir } from "fs/promises";
import { join } from "path";

export const ORGANIGRAMA_DIR = join(process.cwd(), "uploads", "organigrama");

export async function listarOrganigramas() {
  await mkdir(ORGANIGRAMA_DIR, { recursive: true });
  const archivos = (await readdir(ORGANIGRAMA_DIR)).filter((a) => a.toLowerCase().endsWith(".pdf"));
  return archivos
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((archivo) => ({ archivo, titulo: archivo.replace(/\.pdf$/i, "").replace(/_/g, ":") }));
}
