import { prisma } from "@/lib/prisma";

export type Meta = { contratos: number; asesorias: number };

export type FilaMeta = Meta & {
  sucursalId: string;
  sucursal: string;
  contratosHechos: number;
  asesoriasHechas: number;
};

export type FilaAbogadoMeta = { abogado: string; sucursal: string; contratos: number; asesorias: number };

export type ResumenMetas = { sucursales: FilaMeta[]; abogados: FilaAbogadoMeta[] };

type PrefsMetas = { metas?: Record<string, Partial<Meta>> };

export async function resumenMetasMes(mes: number, anio: number): Promise<ResumenMetas> {
  const ini = new Date(`${anio}-${String(mes).padStart(2, "0")}-01T00:00:00.000Z`);
  const fin = new Date(Date.UTC(anio, mes, 1));

  const [sucursales, config, firmados, asesorias] = await Promise.all([
    prisma.sucursal.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.configuracion.findUnique({ where: { id: 1 }, select: { preferencias: true } }),
    prisma.asesoria.findMany({
      where: { status: "contrato_firmado", fechaFirma: { gte: ini, lt: fin } },
      select: { sucursalId: true, abogado: { select: { nombre: true } } },
    }),
    prisma.asesoria.findMany({
      where: { fecha: { gte: ini, lt: fin } },
      select: { sucursalId: true, abogado: { select: { nombre: true } } },
    }),
  ]);

  const metas = ((config?.preferencias ?? {}) as PrefsMetas).metas ?? {};
  const nombreSucursal = new Map(sucursales.map((s) => [s.id, s.nombre]));

  const porAbogado = new Map<string, FilaAbogadoMeta>();
  const sumar = (lista: typeof firmados, campo: "contratos" | "asesorias") => {
    for (const a of lista) {
      const abogado = a.abogado?.nombre ?? "Sin abogado";
      const sucursal = nombreSucursal.get(a.sucursalId ?? "") ?? "Sin sucursal";
      const fila = porAbogado.get(`${sucursal}|${abogado}`) ?? { abogado, sucursal, contratos: 0, asesorias: 0 };
      fila[campo]++;
      porAbogado.set(`${sucursal}|${abogado}`, fila);
    }
  };
  sumar(firmados, "contratos");
  sumar(asesorias, "asesorias");

  return {
    sucursales: sucursales.map((s) => ({
      sucursalId: s.id,
      sucursal: s.nombre,
      contratos: metas[s.id]?.contratos ?? 0,
      asesorias: metas[s.id]?.asesorias ?? 0,
      contratosHechos: firmados.filter((a) => a.sucursalId === s.id).length,
      asesoriasHechas: asesorias.filter((a) => a.sucursalId === s.id).length,
    })),
    abogados: [...porAbogado.values()].sort(
      (a, b) => a.sucursal.localeCompare(b.sucursal) || b.contratos - a.contratos,
    ),
  };
}

export async function guardarMeta(sucursalId: string, meta: Meta) {
  const config = await prisma.configuracion.findUnique({ where: { id: 1 }, select: { preferencias: true } });
  const prefs = (config?.preferencias ?? {}) as PrefsMetas;
  const preferencias = { ...prefs, metas: { ...prefs.metas, [sucursalId]: meta } };
  await prisma.configuracion.upsert({
    where: { id: 1 },
    create: { id: 1, nombreDespacho: "Villafuerte y Asociados", preferencias },
    update: { preferencias },
  });
}
