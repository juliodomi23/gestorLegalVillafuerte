"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverAbogado, resolverSucursal, asignarFolio } from "@/lib/services/resolvers";
import { requireSession, type Sesion } from "@/lib/guard";
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
  presupuestoTexto?: string;
  /** yyyy-mm-dd. Solo se manda al editar, para corregir una fecha mal capturada. */
  fecha?: string;
};

// Solo recepción y admin asignan la asesoría a otro abogado. Va aquí además del
// formulario porque un server action es un endpoint HTTP: cualquiera con sesión
// puede invocarlo con el payload que quiera.
function puedeAsignar(sesion: Sesion) {
  return sesion.rol === "admin" || sesion.rol === "asistente";
}

export async function crearAsesoriaAction(form: FormAsesoria) {
  const sesion = await requireSession();
  const abogado = puedeAsignar(sesion) ? form.abogado || sesion.nombre : sesion.nombre;
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(abogado),
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
      // `seguimiento` no se toca desde la hoja: se escribe después, desde la tabla.
      presupuestoTexto: form.presupuestoTexto || null,
    },
  });
  revalidatePath("/asesorias");
}

export async function editarAsesoriaAction(id: string, form: FormAsesoria) {
  const sesion = await requireSession();
  // Un abogado que edita NO reasigna: se respeta el abogado que ya tenía. Si forzáramos
  // aquí la sesión, un encargado que corrige la asesoría de su gente se la robaría.
  const sucursalId = await resolverSucursal(form.sucursal);
  const reasignar = puedeAsignar(sesion)
    ? { abogadoId: await resolverAbogado(form.abogado || sesion.nombre) }
    : {};
  await prisma.asesoria.update({
    where: { id },
    data: {
      ...reasignar,
      ...(form.fecha ? { fecha: new Date(form.fecha) } : {}),
      nombre: form.nombre,
      telefono: form.telefono || null,
      tema: form.asunto || null,
      pagoAsesoria: form.pago,
      monto: form.pago && form.monto ? form.monto : null,
      status: form.status,
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
      // `seguimiento` no se toca desde la hoja: se escribe después, desde la tabla.
      presupuestoTexto: form.presupuestoTexto || null,
    },
  });
  revalidatePath("/asesorias");
}

/** Nota de seguimiento del prospecto. Se escribe desde la tabla, días después de la asesoría. */
export async function guardarSeguimientoAsesoriaAction(id: string, seguimiento: string) {
  await requireSession();
  await prisma.asesoria.update({ where: { id }, data: { seguimiento: seguimiento.trim() || null } });
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
