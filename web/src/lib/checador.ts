import { prisma } from "@/lib/prisma";
import { slugSucursal, tipoDespuesDe } from "@/lib/checador-regla";

export * from "@/lib/checador-regla";

export async function resolverSucursalPorSlug(slug: string) {
  const sucursales = await prisma.sucursal.findMany();
  return sucursales.find((s) => slugSucursal(s.nombre) === slug) ?? null;
}

export async function siguienteTipo(usuarioId: string): Promise<"entrada" | "salida"> {
  const ultima = await prisma.checada.findFirst({
    where: { usuarioId },
    orderBy: { creadoEn: "desc" },
  });
  return tipoDespuesDe(ultima);
}

// Intentos fallidos de PIN por IP+sucursal, en memoria del proceso — mismo patrón
// que el rate-limit de login en lib/auth.ts (un solo contenedor, alcanza).
const MAX_INTENTOS = 20;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map<string, { conteo: number; desde: number }>();

export function pinBloqueado(clave: string): boolean {
  const e = intentos.get(clave);
  if (!e) return false;
  if (Date.now() - e.desde > VENTANA_MS) {
    intentos.delete(clave);
    return false;
  }
  return e.conteo >= MAX_INTENTOS;
}

export function registrarIntentoPin(clave: string, exito: boolean) {
  if (exito) {
    intentos.delete(clave);
    return;
  }
  const e = intentos.get(clave) ?? { conteo: 0, desde: Date.now() };
  if (Date.now() - e.desde > VENTANA_MS) {
    e.conteo = 0;
    e.desde = Date.now();
  }
  e.conteo += 1;
  intentos.set(clave, e);
}
