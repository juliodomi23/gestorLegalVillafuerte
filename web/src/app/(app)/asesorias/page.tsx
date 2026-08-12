import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AsesoriasClient, { type AsesoriaView } from "./client";
import type { StatusAsesoria } from "@/lib/constants";
import { alcanceDe, porAbogado } from "@/lib/alcance";

export default async function AsesoriasPage() {
  const session = await getServerSession(authOptions);
  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  const [rows, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.asesoria.findMany({
      where: porAbogado(alcance),
      include: { sucursal: true, abogado: true },
      orderBy: { fecha: "desc" },
      take: 300, // ponytail: tope simple en vez de paginación; subir o paginar de verdad si el despacho pasa de esto
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const asesorias: AsesoriaView[] = rows.map((a) => {
    const f = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
    const dd = String(f.getUTCDate()).padStart(2, "0");
    const mm = String(f.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(f.getUTCFullYear());
    return {
      id: a.id,
      fecha: `${dd}/${mm}/${yyyy}`,
      folio: a.folio ?? null,
      nombre: a.nombre ?? "Sin nombre",
      // Vacío es "", nunca "—": estos valores alimentan el formulario de edición y
      // un "—" se guardaría literal (o dejaría el <select> en un valor inexistente,
      // que con `required` bloquea el guardado). El guion lo pone la tabla al pintar.
      telefono: a.telefono ?? "",
      asunto: a.tema ?? a.resumen ?? "",
      sucursal: a.sucursal?.nombre ?? "",
      abogado: a.abogado?.nombre ?? "",
      pago: a.pagoAsesoria,
      monto: Number(a.monto ?? 0),
      status: (a.status as StatusAsesoria) ?? "pendiente",
      urlDocumento: a.urlDocumento ?? null,
      edad: a.edad ?? "",
      sexo: a.sexo ?? "",
      estadoCivil: a.estadoCivil ?? "",
      escolaridad: a.escolaridad ?? "",
      domicilio: a.domicilio ?? "",
      nacionalidad: a.nacionalidad ?? "",
      ocupacion: a.ocupacion ?? "",
      correo: a.correo ?? "",
      domicilioLaboral: a.domicilioLaboral ?? "",
      hijos: a.hijos ?? "",
      nombreHijos: a.nombreHijos ?? "",
      presupuestoTexto: a.presupuestoTexto ?? "",
    };
  });

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  return (
    <AsesoriasClient
      asesorias={asesorias}
      sucursales={sucursales}
      abogados={abogados}
      sesionNombre={session?.user?.name ?? ""}
      sesionRol={session?.user?.rol ?? ""}
    />
  );
}
