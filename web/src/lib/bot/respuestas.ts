import { NextResponse } from "next/server";

export const json = (datos: unknown, status = 200) => NextResponse.json(datos, { status });
export const noEncontrado = (mensaje = "no encontrado") => json({ error: mensaje }, 404);
export const invalido = (mensaje: string, status = 422) => json({ error: mensaje, message: mensaje }, status);

export async function leerJson(req: Request): Promise<Record<string, unknown>> {
  const cuerpo = await req.json().catch(() => null);
  return cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo) ? (cuerpo as Record<string, unknown>) : {};
}
