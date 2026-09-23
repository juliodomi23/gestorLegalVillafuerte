// Datos de los envíos automáticos por WhatsApp que corren cada mañana y cada noche.
// Los consume n8n; aquí vive la lógica para que las reglas sean las mismas si mañana
// se consultan desde otro lado.

import { prisma } from "@/lib/prisma";
import { rangoDelDiaDespacho as rangoDelDia } from "@/lib/fecha";
import { normalizarTelefono, crearDetectorLlegada } from "@/lib/citas-reporte-regla";

function horaLocal(fecha: Date): string {
  return fecha.toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// El teléfono a la vista: el del campo, o el que venga dentro del nombre.
// Las citas del bot llegan como "Asesoría Eunice ‪+52 961 264 1203‬" con el campo
// teléfono vacío, y ese número es justo lo que hace falta para llamarles.
export function telefonoVisible(telefono?: string | null, nombre?: string | null): string {
  const delCampo = normalizarTelefono(telefono);
  if (delCampo.length === 10) return delCampo;
  const delNombre = normalizarTelefono(String(nombre ?? "").replace(/\D/g, "").slice(-10));
  return delNombre.length === 10 ? delNombre : "";
}

export type CitadoDelDia = {
  hora: string;
  cliente: string;
  telefono: string;
  sucursal: string;
  abogado: string;
  estado: string;
};

// Los citados de un día, opcionalmente de una sola sucursal.
export async function citadosDelDia(
  fechaISO: string,
  sucursal?: string
): Promise<CitadoDelDia[]> {
  const citas = await prisma.cita.findMany({
    where: {
      fechaHora: rangoDelDia(fechaISO),
      ...(sucursal ? { sucursal: { nombre: sucursal } } : {}),
    },
    include: {
      cliente: { select: { nombre: true, telefono: true } },
      sucursal: { select: { nombre: true } },
      abogado: { select: { nombre: true } },
    },
    orderBy: { fechaHora: "asc" },
  });

  return citas.map((c) => {
    const nombre = c.cliente?.nombre ?? c.clienteNombre ?? "Sin nombre";
    return {
      hora: horaLocal(c.fechaHora),
      cliente: nombre,
      telefono: telefonoVisible(c.cliente?.telefono ?? c.telefono, nombre),
      sucursal: c.sucursal?.nombre ?? "Sin sucursal",
      abogado: c.abogado?.nombre ?? "Sin asignar",
      estado: c.estado,
    };
  });
}

export type AsesoriaDelDia = {
  hora: string;
  nombre: string;
  telefono: string;
  tema: string;
  abogado: string;
  pago: boolean;
  status: string;
};

// Las asesorías de un día con su detalle, para el resumen de las 9:00.
export async function asesoriasDelDia(
  fechaISO: string,
  sucursal?: string
): Promise<AsesoriaDelDia[]> {
  const lista = await prisma.asesoria.findMany({
    where: {
      fecha: new Date(fechaISO),
      ...(sucursal ? { sucursal: { nombre: sucursal } } : {}),
    },
    include: { abogado: { select: { nombre: true } } },
    orderBy: { creadoEn: "asc" },
  });

  return lista.map((a) => ({
    hora: horaLocal(a.creadoEn),
    nombre: a.nombre ?? "Sin nombre",
    telefono: a.telefono ?? "",
    tema: a.tema ?? "—",
    abogado: a.abogado?.nombre ?? "Sin asignar",
    pago: a.pagoAsesoria,
    status: a.status,
  }));
}

export type Destinatario = {
  nombre: string;
  telefono: string;
  sucursal: string | null;
  tipo: string;
};

// A quién le toca cada envío. Sale de Configuración › Usuarios, no del código.
//
// `recibeEnvio` guarda "todas" o el nombre de la sucursal cuyo resumen recibe esa
// persona, que no tiene por qué ser la de su ficha: los tres coordinadores de Tuxtla
// están dados de alta en otras plazas y aun así el resumen que les toca es el de Tuxtla.
export async function destinatarios(tipo?: "sucursal" | "todas"): Promise<Destinatario[]> {
  const usuarios = await prisma.usuario.findMany({
    where: {
      activo: true,
      telefonoWhatsapp: { not: null },
      ...(tipo === "todas"
        ? { recibeEnvio: "todas" }
        : tipo === "sucursal"
        ? { recibeEnvio: { not: null, notIn: ["", "todas"] } }
        : { recibeEnvio: { not: null } }),
    },
    orderBy: { nombre: "asc" },
  });

  return usuarios.map((u) => ({
    nombre: u.nombre,
    telefono: u.telefonoWhatsapp ?? "",
    // Para el envío por sucursal, la sucursal es la del envío, no la de su ficha.
    sucursal: u.recibeEnvio === "todas" ? null : u.recibeEnvio,
    tipo: u.recibeEnvio === "todas" ? "todas" : "sucursal",
  }));
}

export type NoShow = {
  id: string;
  hora: string;
  cliente: string;
  telefono: string;
  sucursal: string;
  abogado: string;
};

// Quién estaba citado y no dejó rastro de haber venido.
//
// "Llegó" = ese día se registró una asesoría que casa con la cita por teléfono o por
// nombre. Es el criterio que definió el despacho. Las citas ya marcadas como
// canceladas quedan fuera: no son ausencias, son bajas.
//
// Cotejar por nombre además del teléfono importa porque muchas citas del bot traen
// el teléfono metido dentro del nombre y el campo teléfono vacío.
export async function noShowsDelDia(fechaISO: string): Promise<NoShow[]> {
  const [citas, asesorias] = await Promise.all([
    prisma.cita.findMany({
      where: { fechaHora: rangoDelDia(fechaISO), estado: { not: "cancelada" } },
      include: {
        cliente: { select: { nombre: true, telefono: true } },
        sucursal: { select: { nombre: true } },
        abogado: { select: { nombre: true } },
      },
      orderBy: { fechaHora: "asc" },
    }),
    prisma.asesoria.findMany({
      where: { fecha: new Date(fechaISO) },
      select: { nombre: true, telefono: true },
    }),
  ]);

  const llego = crearDetectorLlegada(asesorias);

  return citas
    .filter((c) => !llego({ nombre: c.cliente?.nombre ?? c.clienteNombre ?? "", telefono: c.cliente?.telefono ?? c.telefono }))
    .map((c) => {
      const nombre = c.cliente?.nombre ?? c.clienteNombre ?? "Sin nombre";
      return {
        id: c.id,
        hora: horaLocal(c.fechaHora),
        cliente: nombre,
        telefono: telefonoVisible(c.cliente?.telefono ?? c.telefono, nombre),
        sucursal: c.sucursal?.nombre ?? "Sin sucursal",
        abogado: c.abogado?.nombre ?? "Sin asignar",
      };
    });
}
