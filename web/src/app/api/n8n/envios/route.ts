import { autorizado, noAutorizado, ok, fail, leerBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const HOY = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

// Registra que un envío automático salió (o falló). Lo llaman los CRON de n8n.
export async function POST(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const r = await leerBody<{
    tipo: string;
    destinatario?: string;
    total?: number;
    ok?: boolean;
    detalle?: string;
    fecha?: string;
  }>(req, ["tipo"]);
  if ("error" in r) return r.error;

  try {
    const registro = await prisma.envioRegistro.create({
      data: {
        tipo: r.data.tipo,
        fecha: new Date(r.data.fecha ?? HOY()),
        destinatario: r.data.destinatario ?? null,
        total: r.data.total ?? 0,
        ok: r.data.ok ?? true,
        detalle: r.data.detalle ?? null,
      },
    });
    return ok({ id: registro.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

// ¿Salió ya el envío de hoy? De esto vive el aviso de las 8:30.
// ?tipo=citados_karen &fecha=2026-08-21
export async function GET(req: Request) {
  if (!autorizado(req)) return noAutorizado();
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const fecha = url.searchParams.get("fecha") ?? HOY();
  if (!tipo) return fail("Falta el parámetro tipo");

  try {
    const envios = await prisma.envioRegistro.findMany({
      where: { tipo, fecha: new Date(fecha) },
      orderBy: { creadoEn: "desc" },
    });
    const exitosos = envios.filter((e) => e.ok);
    return ok({
      tipo,
      fecha,
      salio: exitosos.length > 0,
      intentos: envios.length,
      total: exitosos[0]?.total ?? 0,
      destinatarios: exitosos.map((e) => e.destinatario).filter(Boolean),
      ultimoDetalle: envios[0]?.detalle ?? null,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
