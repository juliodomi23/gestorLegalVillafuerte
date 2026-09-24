"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverAbogado, resolverSucursal, asignarFolio } from "@/lib/services/resolvers";
import { fechaFirmaSiAplica } from "@/lib/services/asesorias";
import { requireSession, type Sesion } from "@/lib/guard";
import { crearExpedienteAction, crearClienteRapidoAction } from "../expedientes/actions";
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
      fechaFirma: fechaFirmaSiAplica(form.status, null),
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
  const actual = await prisma.asesoria.findUnique({ where: { id }, select: { fechaFirma: true } });
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
      fechaFirma: fechaFirmaSiAplica(form.status, actual?.fechaFirma ?? null),
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
  const actual = await prisma.asesoria.findUnique({ where: { id }, select: { fechaFirma: true } });
  await prisma.asesoria.update({
    where: { id },
    data: { status, fechaFirma: fechaFirmaSiAplica(status, actual?.fechaFirma ?? null) },
  });
  revalidatePath("/asesorias");
}

const ESTADOS_SEGUIMIENTO_CITA = ["no_contesto", "llamar_despues", "agendo_cita", "descartado"];

type SeguimientoLlamada = { estado: string; nota: string; fecha: string; llamo?: string };

// Quién hizo la llamada: cada quien queda con su nombre de perfil; solo el admin puede
// registrarla a nombre de otro abogado (o dejarla vacía, con "").
function quienLlamo(sesion: Sesion, pedido: string | undefined) {
  if (sesion.rol !== "admin") return sesion.nombre;
  return pedido === undefined ? sesion.nombre : pedido || null;
}

/** Llamada de seguimiento a quien no asistió o ya se asesoró (sección de citas en Asesorías). */
export async function guardarSeguimientoCitaAction(
  id: string,
  seguimiento: SeguimientoLlamada
) {
  const sesion = await requireSession();
  if (seguimiento.estado && !ESTADOS_SEGUIMIENTO_CITA.includes(seguimiento.estado)) {
    throw new Error("Estado inválido");
  }
  await prisma.cita.update({
    where: { id },
    data: {
      seguimientoEstado: seguimiento.estado || null,
      seguimientoNota: seguimiento.nota.trim() || null,
      seguimientoFecha: seguimiento.fecha ? new Date(seguimiento.fecha) : null,
      seguimientoAbogado: quienLlamo(sesion, seguimiento.llamo),
    },
  });
  revalidatePath("/asesorias/no-asistieron");
  return quienLlamo(sesion, seguimiento.llamo) ?? "";
}

/** Llamada de seguimiento a quien ya asesoró y no firma (submenú "Ya asesoraron"). */
export async function guardarSeguimientoAsesoriaLlamadaAction(
  id: string,
  seguimiento: SeguimientoLlamada
) {
  const sesion = await requireSession();
  if (seguimiento.estado && !ESTADOS_SEGUIMIENTO_CITA.includes(seguimiento.estado)) {
    throw new Error("Estado inválido");
  }
  await prisma.asesoria.update({
    where: { id },
    data: {
      seguimientoEstado: seguimiento.estado || null,
      seguimiento: seguimiento.nota.trim() || null,
      seguimientoFecha: seguimiento.fecha ? new Date(seguimiento.fecha) : null,
      seguimientoAbogado: quienLlamo(sesion, seguimiento.llamo),
    },
  });
  revalidatePath("/asesorias/ya-asesoraron");
  return quienLlamo(sesion, seguimiento.llamo) ?? "";
}

/**
 * Deja listo el expediente donde se va a guardar el contrato de esta asesoría: reusa el que
 * ya tenga ligado o lo crea con los datos de la hoja. Devuelve el id del expediente.
 */
export async function prepararExpedienteContratoAsesoriaAction(id: string): Promise<string> {
  await requireSession();
  const a = await prisma.asesoria.findUnique({
    where: { id },
    include: { abogado: { select: { nombre: true } }, sucursal: { select: { nombre: true } } },
  });
  if (!a) throw new Error("La asesoría ya no existe");
  if (a.expedienteId) return a.expedienteId;

  const cliente = await crearClienteRapidoAction(a.nombre ?? "Sin nombre", a.telefono ?? undefined);
  const exp = await crearExpedienteAction({
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    numeroJudicial: "",
    materia: "Otros",
    etapa: "",
    abogado: a.abogado?.nombre ?? "",
    sucursal: a.sucursal?.nombre ?? "",
    rolCliente: "",
    cuantia: "",
  });
  await prisma.asesoria.update({ where: { id }, data: { expedienteId: exp.id, clienteId: cliente.id } });
  return exp.id;
}

export async function borrarAsesoriaAction(id: string) {
  await requireSession();
  await prisma.asesoria.delete({ where: { id } });
  revalidatePath("/asesorias");
}
