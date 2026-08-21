// Datos de los envíos automáticos por WhatsApp que corren cada mañana y cada noche.
// Los consume n8n; aquí vive la lógica para que las reglas sean las mismas si mañana
// se consultan desde otro lado.

import { prisma } from "@/lib/prisma";

const TZ_OFFSET = "-06:00"; // Chiapas, todo el año

function rangoDelDia(fechaISO: string) {
  return {
    gte: new Date(`${fechaISO}T00:00:00${TZ_OFFSET}`),
    lte: new Date(`${fechaISO}T23:59:59.999${TZ_OFFSET}`),
  };
}

function horaLocal(fecha: Date): string {
  return fecha.toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Un teléfono mexicano comparable: solo dígitos y sin el 52/521 de país.
// "+52 961 264 1203", "9612641203" y "5219612641203" tienen que casar entre sí.
export function normalizarTelefono(tel?: string | null): string {
  const d = String(tel ?? "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("521")) return d.slice(3);
  if (d.length > 10 && d.startsWith("52")) return d.slice(2);
  return d.slice(-10);
}

// Nombre comparable: sin acentos, sin dobles espacios, en minúsculas.
export function normalizarNombre(nombre?: string | null): string {
  return String(nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

  return citas.map((c) => ({
    hora: horaLocal(c.fechaHora),
    cliente: c.cliente?.nombre ?? c.clienteNombre ?? "Sin nombre",
    telefono: c.cliente?.telefono ?? c.telefono ?? "",
    sucursal: c.sucursal?.nombre ?? "Sin sucursal",
    abogado: c.abogado?.nombre ?? "Sin asignar",
    estado: c.estado,
  }));
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
export async function destinatarios(tipo?: "sucursal" | "todas"): Promise<Destinatario[]> {
  const usuarios = await prisma.usuario.findMany({
    where: {
      activo: true,
      recibeEnvio: tipo ? tipo : { not: null },
      telefonoWhatsapp: { not: null },
    },
    include: { sucursal: { select: { nombre: true } } },
    orderBy: { nombre: "asc" },
  });

  return usuarios.map((u) => ({
    nombre: u.nombre,
    telefono: u.telefonoWhatsapp ?? "",
    sucursal: u.sucursal?.nombre ?? null,
    tipo: u.recibeEnvio ?? "",
  }));
}

export type NoShow = {
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

  const telefonosAtendidos = new Set(
    asesorias.map((a) => normalizarTelefono(a.telefono)).filter((t) => t.length === 10)
  );
  const nombresAtendidos = asesorias
    .map((a) => normalizarNombre(a.nombre))
    .filter((n) => n.length >= 5);

  return citas
    .filter((c) => {
      const nombre = c.cliente?.nombre ?? c.clienteNombre ?? "";
      const tel = normalizarTelefono(c.cliente?.telefono ?? c.telefono);
      // El teléfono puede venir dentro del nombre ("Asesoría Eunice 961 264 1203").
      const telEnNombre = normalizarTelefono(nombre.replace(/\D/g, "").slice(-10));

      if (tel.length === 10 && telefonosAtendidos.has(tel)) return false;
      if (telEnNombre.length === 10 && telefonosAtendidos.has(telEnNombre)) return false;

      const n = normalizarNombre(nombre);
      if (n.length >= 5 && nombresAtendidos.some((a) => a.includes(n) || n.includes(a))) {
        return false;
      }
      return true;
    })
    .map((c) => ({
      hora: horaLocal(c.fechaHora),
      cliente: c.cliente?.nombre ?? c.clienteNombre ?? "Sin nombre",
      telefono: c.cliente?.telefono ?? c.telefono ?? "",
      sucursal: c.sucursal?.nombre ?? "Sin sucursal",
      abogado: c.abogado?.nombre ?? "Sin asignar",
    }));
}
