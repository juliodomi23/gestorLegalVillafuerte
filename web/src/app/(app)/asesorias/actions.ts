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
  presupuestoTexto?: string;
};

export async function crearAsesoriaAction(form: FormAsesoria) {
  const sesion = await requireSession();
  // El "abogado que atendió" es quien está en sesión, salvo que un admin
  // registre a nombre de otro (necesitan poder capturar por otros abogados).
  // Quien captura no siempre es quien atendió: el campo va abierto y se cae
  // a la sesión solo si viene vacío.
  const abogado = form.abogado || sesion.nombre;
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
      presupuestoTexto: form.presupuestoTexto || null,
    },
  });
  revalidatePath("/asesorias");
}

export async function editarAsesoriaAction(id: string, form: FormAsesoria) {
  const sesion = await requireSession();
  // Quien captura no siempre es quien atendió: el campo va abierto y se cae
  // a la sesión solo si viene vacío.
  const abogado = form.abogado || sesion.nombre;
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(abogado),
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
      presupuestoTexto: form.presupuestoTexto || null,
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
