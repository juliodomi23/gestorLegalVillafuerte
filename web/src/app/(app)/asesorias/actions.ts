"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverAbogado, resolverSucursal, asignarFolio } from "@/lib/services/resolvers";
import { requireSession } from "@/lib/guard";
import type { StatusAsesoria } from "@/lib/constants";

export type FormAsesoria = {
  nombre: string;
  telefono: string;
  asunto: string;
  sucursal: string;
  abogado: string;
  pago: boolean;
  monto: number | null;
  status: StatusAsesoria;
  edad?: string;
  sexo?: string;
  estadoCivil?: string;
  escolaridad?: string;
  domicilio?: string;
  nacionalidad?: string;
  ocupacion?: string;
  correo?: string;
  domicilioLaboral?: string;
  hijos?: string;
  nombreHijos?: string;
  presupuestoOpcion?: string;
  presupuestoPorcentaje?: number | null;
};

export async function crearAsesoriaAction(form: FormAsesoria) {
  await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  const folio = await asignarFolio(sucursalId);
  await prisma.asesoria.create({
    data: {
      folio,
      nombre: form.nombre,
      telefono: form.telefono || null,
      tema: form.asunto || null,
      pagoAsesoria: form.pago,
      monto: form.pago && form.monto ? form.monto : null,
      status: form.status,
      abogadoId,
      sucursalId,
      origen: "web",
      edad: form.edad || null,
      sexo: form.sexo || null,
      estadoCivil: form.estadoCivil || null,
      escolaridad: form.escolaridad || null,
      domicilio: form.domicilio || null,
      nacionalidad: form.nacionalidad || null,
      ocupacion: form.ocupacion || null,
      correo: form.correo || null,
      domicilioLaboral: form.domicilioLaboral || null,
      hijos: form.hijos || null,
      nombreHijos: form.nombreHijos || null,
      presupuestoOpcion: form.presupuestoOpcion || null,
      presupuestoPorcentaje: form.presupuestoPorcentaje ?? null,
    },
  });
  revalidatePath("/asesorias");
}

export async function editarAsesoriaAction(id: string, form: FormAsesoria) {
  await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  await prisma.asesoria.update({
    where: { id },
    data: {
      nombre: form.nombre,
      telefono: form.telefono || null,
      tema: form.asunto || null,
      pagoAsesoria: form.pago,
      monto: form.pago && form.monto ? form.monto : null,
      status: form.status,
      abogadoId,
      sucursalId,
      edad: form.edad || null,
      sexo: form.sexo || null,
      estadoCivil: form.estadoCivil || null,
      escolaridad: form.escolaridad || null,
      domicilio: form.domicilio || null,
      nacionalidad: form.nacionalidad || null,
      ocupacion: form.ocupacion || null,
      correo: form.correo || null,
      domicilioLaboral: form.domicilioLaboral || null,
      hijos: form.hijos || null,
      nombreHijos: form.nombreHijos || null,
      presupuestoOpcion: form.presupuestoOpcion || null,
      presupuestoPorcentaje: form.presupuestoPorcentaje ?? null,
    },
  });
  revalidatePath("/asesorias");
}

export async function cambiarStatusAsesoriaAction(id: string, status: StatusAsesoria) {
  await requireSession();
  await prisma.asesoria.update({ where: { id }, data: { status } });
  revalidatePath("/asesorias");
}

export async function borrarAsesoriaAction(id: string) {
  await requireSession();
  await prisma.asesoria.delete({ where: { id } });
  revalidatePath("/asesorias");
}
