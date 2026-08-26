"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { requireSession, type Sesion } from "@/lib/guard";
import { parsear, urlHttpSchema, montoSchema } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";
import { tieneAccesoExpediente } from "@/lib/alcance";
import { unlink } from "fs/promises";
import { join } from "path";

// Un expediente lo puede tocar su abogado responsable, su encargado, a quien se lo
// compartieron puntualmente, o un admin (ver lib/alcance.ts).
async function exigirDuenoExpediente(expedienteId: string, sesion: Sesion) {
  if (await tieneAccesoExpediente(expedienteId, sesion.id, sesion.rol)) return;
  throw new Error("Sin permiso sobre este expediente");
}

// Para registros hijos (actuación, término, parte...) no confiamos en el expedienteId
// que manda el cliente: lo tomamos del propio registro para saber el dueño real.
type ConExpediente = {
  findUnique(args: { where: { id: string }; select: { expedienteId: true } }): Promise<{ expedienteId: string | null } | null>;
};

// Verifica el permiso sobre el expediente dueño del registro y devuelve su id.
// Los movimientos de caja pueden no tener expediente (caja general): esos solo los toca un admin.
async function exigirDuenoDeHijo(delegate: ConExpediente, id: string, sesion: Sesion): Promise<string | null> {
  const row = await delegate.findUnique({ where: { id }, select: { expedienteId: true } });
  if (!row) throw new Error("Registro no encontrado");
  if (row.expedienteId === null) {
    if (sesion.rol !== "admin") throw new Error("Sin permiso sobre este registro");
    return null;
  }
  await exigirDuenoExpediente(row.expedienteId, sesion);
  return row.expedienteId;
}

// Borra el PDF del disco. Los documentos de Drive solo son un link: no hay nada que borrar.
async function borrarArchivoSubido(doc: { tipo: string | null; linkDrive: string | null }) {
  if (doc.tipo !== "pdf" || !doc.linkDrive?.startsWith("/api/uploads/")) return;
  const filename = doc.linkDrive.replace("/api/uploads/", "");
  try {
    await unlink(join(process.cwd(), "uploads", filename));
  } catch {
    // archivo ya no existe, ignorar
  }
}

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
  const sesion = await requireSession();
  const id = await upsertCliente(nombre, telefono, sesion.id);
  return { id, nombre };
}

export async function crearExpedienteAction(form: FormExpediente) {
  const sesion = await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);

  let clienteId: string | null = form.clienteId || null;
  if (!clienteId && form.clienteNombre) {
    // El cliente nuevo pertenece al abogado del expediente; si no se eligió, a quien lo crea.
    clienteId = await upsertCliente(form.clienteNombre, undefined, abogadoId ?? sesion.id);
  }

  const dataBase = {
    numeroJudicial: form.numeroJudicial || null,
    clienteId,
    materia: form.materia || null,
    etapaProcesal: form.etapa || null,
    abogadoResponsableId: abogadoId,
    sucursalId,
  };

  // numeroInterno es @unique en el schema: si dos personas crean un expediente
  // al mismo tiempo y calculan el mismo folio, la BD rechaza el segundo insert
  // (P2002) y aquí reintentamos con el siguiente número en vez de duplicar.
  const año = new Date().getFullYear();
  let exp;
  for (let intento = 0; intento < 5; intento++) {
    const total = await prisma.expediente.count();
    const numeroInterno = `EXP-${año}-${String(total + 1 + intento).padStart(4, "0")}`;
    try {
      exp = await prisma.expediente.create({ data: { ...dataBase, numeroInterno } });
      break;
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "P2002") continue;
      throw err;
    }
  }
  if (!exp) throw new Error("No se pudo generar el número de expediente, intenta de nuevo.");

  await registrarAuditoria(sesion.id, exp.id, "crear", "expediente");
  revalidatePath("/expedientes");
  revalidatePath("/contratos");
  return { id: exp.id, numeroInterno: exp.numeroInterno };
}

export async function editarExpedienteAction(id: string, form: FormExpediente) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(id, sesion);
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);

  let clienteId: string | null = form.clienteId || null;
  if (!clienteId && form.clienteNombre) {
    clienteId = await upsertCliente(form.clienteNombre, undefined, abogadoId ?? sesion.id);
  }

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

// Reemplaza la lista completa de con quién se comparte el expediente (además del
// abogado responsable y sus encargados, que ya lo ven sin esto).
export async function compartirExpedienteAction(expedienteId: string, abogadoIds: string[]) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
  await prisma.expediente.update({
    where: { id: expedienteId },
    data: { compartidoCon: { set: abogadoIds.map((id) => ({ id })) } },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export type FormActuacion = {
  tipo: string;
  descripcion: string;
  fecha: string;
};

export async function crearActuacionAction(expedienteId: string, form: FormActuacion) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
  const actuacion = await prisma.actuacion.create({
    data: {
      expedienteId,
      registradoPor: sesion.id,
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
  const sesion = await requireSession();
  const expedienteReal = await exigirDuenoDeHijo(prisma.actuacion, actuacionId, sesion);
  // Los documentos de la actuación se van con ella: si no, el FK queda en NULL y el
  // PDF sigue apareciendo en la pestaña Documentos del expediente.
  const docs = await prisma.documento.findMany({ where: { actuacionId } });
  await prisma.documento.deleteMany({ where: { actuacionId } });
  await Promise.all(docs.map(borrarArchivoSubido));
  await prisma.actuacion.delete({ where: { id: actuacionId } });
  await registrarAuditoria(sesion.id, expedienteReal, "borrar", "actuacion");
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarExpedienteAction(id: string) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(id, sesion);
  await prisma.expediente.delete({ where: { id } });
  await registrarAuditoria(sesion.id, id, "borrar", "expediente");
  revalidatePath("/expedientes");
}

export async function renombrarExpedienteAction(id: string, nuevoNumero: string) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(id, sesion);
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
  const sesion = await requireSession();
  await exigirDuenoExpediente(id, sesion);
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
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
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
  const sesion = await requireSession();
  await exigirDuenoDeHijo(prisma.termino, terminoId, sesion);
  await prisma.termino.update({ where: { id: terminoId }, data: { cumplido: true } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarTerminoAction(terminoId: string, expedienteId: string) {
  const sesion = await requireSession();
  const expedienteReal = await exigirDuenoDeHijo(prisma.termino, terminoId, sesion);
  await prisma.termino.delete({ where: { id: terminoId } });
  await registrarAuditoria(sesion.id, expedienteReal, "borrar", "termino");
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ── Partes ────────────────────────────────────────────────────────────────────

export async function crearParteAction(expedienteId: string, data: { nombre: string; rol: string; contacto: string }) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
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
  const sesion = await requireSession();
  await exigirDuenoDeHijo(prisma.parte, parteId, sesion);
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
  const sesion = await requireSession();
  await exigirDuenoDeHijo(prisma.parte, parteId, sesion);
  await prisma.parte.delete({ where: { id: parteId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ── Audiencias ────────────────────────────────────────────────────────────────

export async function crearAudienciaAction(expedienteId: string, data: { fechaHora: string; tipo: string; lugar: string; estado: string }) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
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
  const sesion = await requireSession();
  await exigirDuenoDeHijo(prisma.audiencia, audienciaId, sesion);
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
  const sesion = await requireSession();
  await exigirDuenoDeHijo(prisma.audiencia, audienciaId, sesion);
  await prisma.audiencia.delete({ where: { id: audienciaId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ── Caja ──────────────────────────────────────────────────────────────────────

export async function crearMovimientoAction(expedienteId: string, data: { tipo: string; concepto: string; monto: string; fecha: string }) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
  const monto = parsear(montoSchema, data.monto);
  await prisma.movimientoCaja.create({
    data: {
      expedienteId,
      registradoPor: sesion.id,
      tipo: data.tipo,
      concepto: data.concepto.trim() || null,
      monto,
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarMovimientoAction(movimientoId: string, expedienteId: string) {
  const sesion = await requireSession();
  const expedienteReal = await exigirDuenoDeHijo(prisma.movimientoCaja, movimientoId, sesion);
  await prisma.movimientoCaja.delete({ where: { id: movimientoId } });
  await registrarAuditoria(sesion.id, expedienteReal, "borrar", "movimiento_caja");
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Gastos (Otros tipos de pago) ──────────────────────────────────────────────

export async function crearGastoAction(expedienteId: string, data: { fecha: string; concepto: string; beneficiario: string; monto: string }) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
  const monto = parsear(montoSchema, data.monto);
  await prisma.gastoExpediente.create({
    data: {
      expedienteId,
      registradoPor: sesion.id,
      concepto: data.concepto.trim(),
      beneficiario: data.beneficiario.trim() || null,
      monto,
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
    },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarGastoAction(gastoId: string, expedienteId: string) {
  const sesion = await requireSession();
  const expedienteReal = await exigirDuenoDeHijo(prisma.gastoExpediente, gastoId, sesion);
  await prisma.gastoExpediente.delete({ where: { id: gastoId } });
  await registrarAuditoria(sesion.id, expedienteReal, "borrar", "gasto");
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ── Plan de pago ──────────────────────────────────────────────────────────────

export type FormPlanPago = {
  tipo: string;
  montoTotal: string;
  montoInicial: string;
  montoFinal: string;
  montoPeriodico: string;
  fechaProxPago: string;
  notas: string;
};

export async function upsertPlanPagoAction(expedienteId: string, form: FormPlanPago) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
  const data = {
    tipo: form.tipo,
    montoTotal: parseFloat(form.montoTotal.replace(/[$,]/g, "")) || 0,
    montoInicial: form.montoInicial ? parseFloat(form.montoInicial.replace(/[$,]/g, "")) : null,
    montoFinal: form.montoFinal ? parseFloat(form.montoFinal.replace(/[$,]/g, "")) : null,
    montoPeriodico: form.montoPeriodico ? parseFloat(form.montoPeriodico.replace(/[$,]/g, "")) : null,
    fechaProxPago: form.fechaProxPago ? new Date(form.fechaProxPago) : null,
    notas: form.notas.trim() || null,
  };
  await prisma.planPago.upsert({
    where: { expedienteId },
    update: data,
    create: { expedienteId, ...data },
  });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function borrarPlanPagoAction(expedienteId: string) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
  await prisma.planPago.deleteMany({ where: { expedienteId } });
  revalidatePath(`/expedientes/${expedienteId}`);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function borrarDocumentoAction(documentoId: string, expedienteId: string) {
  const sesion = await requireSession();
  const doc = await prisma.documento.findUnique({ where: { id: documentoId } });
  if (!doc) return;
  await exigirDuenoExpediente(doc.expedienteId, sesion);

  await prisma.documento.delete({ where: { id: documentoId } });
  await registrarAuditoria(sesion.id, doc.expedienteId, "borrar", "documento");
  await borrarArchivoSubido(doc);

  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function agregarDocumentoDriveAction(
  expedienteId: string,
  nombre: string,
  url: string,
  actuacionId?: string,
) {
  const sesion = await requireSession();
  await exigirDuenoExpediente(expedienteId, sesion);
  // Solo http(s): evita XSS por `javascript:` en el <a href> que renderiza el link.
  const urlSegura = parsear(urlHttpSchema, url);
  const doc = await prisma.documento.create({
    data: {
      expedienteId,
      actuacionId: actuacionId ?? null,
      nombre: nombre.trim() || "Documento",
      tipo: "drive",
      linkDrive: urlSegura,
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
