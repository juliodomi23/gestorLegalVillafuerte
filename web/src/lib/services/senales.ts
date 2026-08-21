// Señales: lo que el gestor ya sabe de un día, para no tener que preguntárselo a nadie.
//
// La rutina del coordinador es en gran parte "preguntar a X si ya hizo Y", y varias
// de esas Y dejan rastro en el sistema. Cada señal responde eso con datos: cuántas
// asesorías se registraron, cuántas llamadas se marcaron, si ya se cortó caja.
//
// Son informativas, no automáticas: la actividad se sigue marcando a mano. Una señal
// en cero puede significar "no lo han hecho" o "lo hicieron y no lo capturaron", y
// esa diferencia la resuelve una persona, no una consulta.

import { prisma } from "@/lib/prisma";
import { rangoDelDiaDespacho as rangoDelDia } from "@/lib/fecha";

export type Senal = {
  clave: string;
  hecho: boolean;
  detalle: string;
};

const plural = (n: number, singular: string, plural_: string) =>
  `${n} ${n === 1 ? singular : plural_}`;

type Calculo = (fechaISO: string) => Promise<Senal>;

const CALCULOS: Record<string, Calculo> = {
  async asesorias(fechaISO) {
    const dia = new Date(fechaISO);
    const [total, pagadas] = await Promise.all([
      prisma.asesoria.count({ where: { fecha: dia } }),
      prisma.asesoria.count({ where: { fecha: dia, pagoAsesoria: true } }),
    ]);
    return {
      clave: "asesorias",
      hecho: total > 0,
      detalle:
        total === 0
          ? "Sin asesorías capturadas hoy"
          : `${plural(total, "asesoría capturada", "asesorías capturadas")} · ${pagadas} con pago`,
    };
  },

  async llamadas(fechaISO) {
    const dia = new Date(fechaISO);
    const [llamadas, seguimientos] = await Promise.all([
      prisma.llamada.count({ where: { fecha: dia } }),
      prisma.seguimiento.count({ where: { ultimoContacto: dia } }),
    ]);
    const total = llamadas + seguimientos;
    return {
      clave: "llamadas",
      hecho: total > 0,
      detalle:
        total === 0
          ? "Sin llamadas registradas hoy"
          : `${plural(total, "llamada registrada", "llamadas registradas")}`,
    };
  },

  async documentos(fechaISO) {
    const total = await prisma.documento.count({ where: { creadoEn: rangoDelDia(fechaISO) } });
    return {
      clave: "documentos",
      hecho: total > 0,
      detalle:
        total === 0
          ? "Sin documentos subidos hoy"
          : `${plural(total, "documento subido", "documentos subidos")}`,
    };
  },

  async caja(fechaISO) {
    const total = await prisma.movimientoCaja.count({ where: { fecha: new Date(fechaISO) } });
    return {
      clave: "caja",
      hecho: total > 0,
      detalle:
        total === 0
          ? "Caja sin movimientos hoy"
          : `${plural(total, "movimiento de caja", "movimientos de caja")}`,
    };
  },

  async citas(fechaISO) {
    const rango = rangoDelDia(fechaISO);
    const [total, resueltas] = await Promise.all([
      prisma.cita.count({ where: { fechaHora: rango } }),
      prisma.cita.count({ where: { fechaHora: rango, estado: { not: "agendada" } } }),
    ]);
    return {
      clave: "citas",
      hecho: total > 0 && resueltas === total,
      detalle:
        total === 0
          ? "Sin citas para hoy"
          : `${resueltas} de ${total} citas con estado definido`,
    };
  },

  async actuaciones(fechaISO) {
    const total = await prisma.actuacion.count({ where: { fecha: new Date(fechaISO) } });
    return {
      clave: "actuaciones",
      hecho: total > 0,
      detalle:
        total === 0
          ? "Sin actuaciones capturadas hoy"
          : `${plural(total, "actuación capturada", "actuaciones capturadas")}`,
    };
  },
};

// Calcula de una sola vez las señales que hagan falta ese día. Cada una se consulta
// una vez aunque diez actividades la compartan.
export async function calcularSenales(
  claves: string[],
  fechaISO: string
): Promise<Record<string, Senal>> {
  const unicas = Array.from(new Set(claves.filter((c) => c in CALCULOS)));
  const resultados = await Promise.all(unicas.map((c) => CALCULOS[c](fechaISO)));
  return Object.fromEntries(resultados.map((s) => [s.clave, s]));
}
