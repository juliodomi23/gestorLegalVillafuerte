"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { unlink } from "fs/promises";
import { join } from "path";

export type FormExpediente = {
  clienteId: string;
  clienteNombre: string;
  numeroJudicial: string;
  materia: string;
  etapa: string;
  abogado: string;
  sucursal: string;
  rolCliente: string;
  cuantia: string;
};

export async function crearClienteRapidoAction(nombre: string, telefono?: string) {
  const id = await upsertCliente(nombre, telefono);
  return { id, nombre };
}

export async function crearExpedienteAction(form: FormExpediente) {
  let clienteId: string | null = form.clienteId || null;
  if (!clienteId && form.clienteNombre) {
    clienteId = await upsertCliente(form.clienteNombre);
  }

  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);

  const año = new Date().getFullYear();
  const total = await prisma.expediente.count();
  await prisma.expediente.create({
    data: {
      numeroInterno: `EXP-${año}-${String(total + 1).padStart(4, "0")}`,
      numeroJudicial: form.numeroJudicial || null,
      clienteId,
      materia: form.materia || null,
      etapaProcesal: form.etapa || null,
      abogadoResponsableId: abogadoId,
      sucursalId,
    },
  });
  revalidatePath("/expedientes");
}

export async function editarExpedienteAction(id: string, form: FormExpediente) {
  let clienteId: string | null = form.clienteId || null;
  if (!clienteId && form.clienteNombre) {
    clienteId = await upsertCliente(form.clienteNombre);
  }

  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);

  await prisma.expediente.update({
    where: { id },
    data: {
      numeroJudicial: form.numeroJudicial || null,
      clienteId,
      materia: form.materia || null,
      etapaProcesal: form.etapa || null,
      abogadoResponsableId: abogadoId,
      sucursalId,
      rolCliente: form.rolCliente || null,
      cuantia: form.cuantia ? parseFloat(form.cuantia) : null,
    },
  });
  revalidatePath("/expedientes");
  revalidatePath(`/expedientes/${id}`);
}

export type FormActuacion = {
  tipo: string;
  descripcion: string;
  fecha: string;
};

export async function crearActuacionAction(expedienteId: string, usuarioId: string, form: FormActuacion) {
  const actuacion = await prisma.actuacion.create({
    data: {
      expedienteId,
      registradoPor: usuarioId || null,
      tipo: form.tipo || null,
      descripcion: form.descripcion.trim() || null,
      fecha: form.fecha ? new Date(form.fecha) : new Date(),
      origen: "web",
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
  return { id: actuacion.id };
}

export async function borrarActuacionAction(actuacionId: string, expedienteId: string) {
  await prisma.actuacion.delete({ where: { id: actuacionId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarExpedienteAction(id: string) {
  await prisma.expediente.delete({ where: { id } });
  revalidatePath("/expedientes");
}

export async function renombrarExpedienteAction(id: string, nuevoNumero: string) {
  const limpio = nuevoNumero.trim();
  if (!limpio) return { error: "El número no puede estar vacío." };
  const existe = await prisma.expediente.findFirst({ where: { numeroInterno: limpio, NOT: { id } } });
  if (existe) return { error: "Ya existe un expediente con ese número." };
  await prisma.expediente.update({ where: { id }, data: { numeroInterno: limpio } });
  revalidatePath(`/expedientes/${id}`);
  revalidatePath("/expedientes");
  return { ok: true };
}

export async function cambiarEstadoAction(id: string, estado: string, nota: string) {
  await prisma.expediente.update({
    where: { id },
    data: {
      estado,
      resumen: nota.trim() || null,
    },
  });
  revalidatePath(`/expedientes/${id}`);
}

// ── Términos ──────────────────────────────────────────────────────────────────

export type FormTermino = {
  tipo: string;
  descripcion: string;
  fechaAcuerdo: string;
  diasParaContestar: string;
  vencimientoTermino: string;
};

export async function crearTerminoAction(expedienteId: string, form: FormTermino) {
  await prisma.termino.create({
    data: {
      expedienteId,
      tipo: form.tipo || "termino",
      descripcion: form.descripcion.trim() || null,
      fechaAcuerdo: form.fechaAcuerdo ? new Date(form.fechaAcuerdo) : null,
      diasParaContestar: form.diasParaContestar ? parseInt(form.diasParaContestar) : null,
      vencimientoTermino: form.vencimientoTermino ? new Date(form.vencimientoTermino) : null,
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function marcarCumplidoTerminoAction(terminoId: string, expedienteId: string) {
  await prisma.termino.update({ where: { id: terminoId }, data: { cumplido: true } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarTerminoAction(terminoId: string, expedienteId: string) {
  await prisma.termino.delete({ where: { id: terminoId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ── Partes ────────────────────────────────────────────────────────────────────

export async function crearParteAction(expedienteId: string, data: { nombre: string; rol: string; contacto: string }) {
  await prisma.parte.create({
    data: {
      expedienteId,
      nombre: data.nombre.trim(),
      rol: data.rol || null,
      contacto: data.contacto.trim() || null,
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function editarParteAction(parteId: string, expedienteId: string, data: { nombre: string; rol: string; contacto: string }) {
  await prisma.parte.update({
    where: { id: parteId },
    data: {
      nombre: data.nombre.trim(),
      rol: data.rol || null,
      contacto: data.contacto.trim() || null,
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarParteAction(parteId: string, expedienteId: string) {
  await prisma.parte.delete({ where: { id: parteId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ── Audiencias ────────────────────────────────────────────────────────────────

export async function crearAudienciaAction(expedienteId: string, data: { fechaHora: string; tipo: string; lugar: string; estado: string }) {
  await prisma.audiencia.create({
    data: {
      expedienteId,
      fechaHora: new Date(data.fechaHora),
      tipo: data.tipo || null,
      lugar: data.lugar.trim() || null,
      estado: data.estado || "programada",
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function editarAudienciaAction(audienciaId: string, expedienteId: string, data: { fechaHora: string; tipo: string; lugar: string; estado: string }) {
  await prisma.audiencia.update({
    where: { id: audienciaId },
    data: {
      fechaHora: new Date(data.fechaHora),
      tipo: data.tipo || null,
      lugar: data.lugar.trim() || null,
      estado: data.estado || "programada",
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarAudienciaAction(audienciaId: string, expedienteId: string) {
  await prisma.audiencia.delete({ where: { id: audienciaId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ── Caja ──────────────────────────────────────────────────────────────────────

export async function crearMovimientoAction(expedienteId: string, usuarioId: string, data: { tipo: string; concepto: string; monto: string; fecha: string }) {
  await prisma.movimientoCaja.create({
    data: {
      expedienteId,
      registradoPor: usuarioId || null,
      tipo: data.tipo,
      concepto: data.concepto.trim() || null,
      monto: parseFloat(data.monto),
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarMovimientoAction(movimientoId: string, expedienteId: string) {
  await prisma.movimientoCaja.delete({ where: { id: movimientoId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function borrarDocumentoAction(documentoId: string, expedienteId: string) {
  const doc = await prisma.documento.findUnique({ where: { id: documentoId } });
  if (!doc) return;

  await prisma.documento.delete({ where: { id: documentoId } });

  if (doc.tipo === "pdf" && doc.linkDrive?.startsWith("/api/uploads/")) {
    const filename = doc.linkDrive.replace("/api/uploads/", "");
    try {
      await unlink(join(process.cwd(), "uploads", filename));
    } catch {
      // archivo ya no existe, ignorar
    }
  }

  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function agregarDocumentoDriveAction(
  expedienteId: string,
  nombre: string,
  url: string,
  actuacionId?: string,
) {
  const doc = await prisma.documento.create({
    data: {
      expedienteId,
      actuacionId: actuacionId ?? null,
      nombre: nombre.trim() || "Documento",
      tipo: "drive",
      linkDrive: url.trim(),
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
  return {
    id: doc.id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    linkDrive: doc.linkDrive,
    fecha: doc.creadoEn.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }),
  };
}
