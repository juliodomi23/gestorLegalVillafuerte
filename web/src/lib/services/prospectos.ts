import { prisma } from "@/lib/prisma";
import { porAbogado, type Alcance } from "@/lib/alcance";
import { hoyDespacho, OFFSET_DESPACHO } from "@/lib/fecha";
import { lunesDe } from "@/lib/services/productividad";

export const ANIO_PROSPECTOS = 2026;

export function mesActualMX(): number {
  return parseInt(
    new Date().toLocaleString("en-US", { month: "numeric", timeZone: "America/Mexico_City" })
  );
}

export type DatosProspecto = {
  nombre: string;
  telefono?: string;
  ciudad?: string;
  asunto?: string;
  fechaLlamada?: string;
  conversationId?: string;
};

// El bot (n8n) calcula "hoy" con el reloj UTC del servidor, no con hora de México:
// después de las 6pm en Chiapas, UTC ya cambió de día y el bot manda la fecha de
// "mañana". No hay forma de reconstruir el día correcto a partir de ese valor, así
// que se ignora y se calcula aquí mismo con la hora real del servidor.
function fechaHoyMexico(): Date {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return new Date(`${hoy}T00:00:00.000Z`);
}

// Dedup: si el mismo teléfono ya existe como prospecto en los últimos 30 días → actualiza.
// Evita duplicados cuando el cron manda el mismo lote varias veces.
export async function upsertProspecto(d: DatosProspecto) {
  const treintaDias = new Date();
  treintaDias.setDate(treintaDias.getDate() - 30);

  if (d.telefono) {
    const existente = await prisma.prospecto.findFirst({
      where: {
        telefono: d.telefono,
        creadoEn: { gte: treintaDias },
      },
      orderBy: { creadoEn: "desc" },
    });

    if (existente) {
      return prisma.prospecto.update({
        where: { id: existente.id },
        data: {
          nombre: d.nombre,
          ciudad: d.ciudad ?? existente.ciudad,
          asunto: d.asunto ?? existente.asunto,
          fechaLlamada: fechaHoyMexico(),
          conversationId: d.conversationId ?? existente.conversationId,
        },
      });
    }
  }

  return prisma.prospecto.create({
    data: {
      nombre: d.nombre,
      telefono: d.telefono ?? null,
      ciudad: d.ciudad ?? null,
      asunto: d.asunto ?? null,
      fechaLlamada: fechaHoyMexico(),
      conversationId: d.conversationId ?? null,
    },
  });
}

// Prospectos del bot de WhatsApp (tienen conversationId) que llevan entre 24 y 72 horas
// sin avanzar de estado. El CRON de seguimiento revisa las etiquetas de Chatwoot antes de
// escribirles: si ya agendaron, solo actualiza el estado sin mandar el mensaje de nuevo.
export async function listarProspectosPendientes24h() {
  const desde = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const hasta = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.prospecto.findMany({
    where: {
      estado: "por_contactar",
      conversationId: { not: null },
      creadoEn: { gte: desde, lte: hasta },
    },
    orderBy: { creadoEn: "asc" },
  });
}

export async function actualizarEstadoProspecto(
  id: string,
  estado: string,
  nota?: string,
  opts?: { fechaContacto?: string; abogadoId?: string | null }
) {
  const p = await prisma.prospecto.update({
    where: { id },
    data: {
      estado,
      ...(nota !== undefined && { nota }),
      ...(opts?.fechaContacto !== undefined && {
        fechaContacto: opts.fechaContacto ? new Date(`${opts.fechaContacto}T00:00:00.000Z`) : null,
      }),
      ...(opts?.abogadoId !== undefined && { abogadoId: opts.abogadoId }),
    },
  });

  // Historial para "Llamadas por abogado": un registro por abogado+día, aunque la
  // fila se reasigne después a otro abogado otro día (ver LlamadaProspecto en el
  // schema) — así la llamada de quien marcó primero no se pierde al sobrescribirse.
  if (opts?.abogadoId && p.fechaContacto) {
    await prisma.llamadaProspecto.upsert({
      where: {
        prospectoId_abogadoId_fecha: { prospectoId: id, abogadoId: opts.abogadoId, fecha: p.fechaContacto },
      },
      create: { prospectoId: id, abogadoId: opts.abogadoId, fecha: p.fechaContacto },
      update: {},
    });
  }

  return p;
}

export async function borrarProspecto(id: string) {
  return prisma.prospecto.delete({ where: { id } });
}

// Se llama justo cuando el bot agenda una cita presencial, para que el estado se
// refleje al instante y el CRON de 24h (o el abogado revisando la lista) no le
// llame a alguien que ya tiene cita. Antes solo se marcaba al día siguiente.
export async function marcarAgendoCitaPorConversacion(conversationId: string) {
  const p = await prisma.prospecto.findFirst({
    where: { conversationId },
    orderBy: { creadoEn: "desc" },
  });
  if (!p || p.estado === "convertido") return p;
  return actualizarEstadoProspecto(p.id, "agendo_cita");
}

export type ResumenAbogado = {
  abogadoId: string;
  nombre: string;
  sucursalNombre: string | null;
  llamadasMes: number;
  agendadasMes: number;
  citasMes: number;
  contratosMes: number;
  llamadasSemana: number;
  agendadasSemana: number;
  citasSemana: number;
  contratosSemana: number;
  llamadasHoy: number;
  agendadasHoy: number;
  citasHoy: number;
  contratosHoy: number;
};

// Cuánto está llamando cada abogado a partir de que empezaron el lunes las llamadas
// a prospectos: llamadas hechas (fechaContacto), cuántas agendaron cita, y cuántas de
// esas citas realmente se dieron (Cita.estado = "asesorada"; no hay liga directa
// prospecto→cita, así que la cita cuenta por su propio abogadoId, no por el del
// prospecto — es una aproximación, no un cruce exacto por persona).
//
// mes/anio: qué mes reportar (1-12). Por defecto el mes en curso. Un abogado puede
// estar llamando prospectos viejos (ej. registrados en agosto) — esas llamadas cuentan
// para el mes en que se hicieron (fechaContacto), no para el mes en que se registró el
// prospecto, así que hay que poder ver meses anteriores para que no "desaparezcan".
export async function resumenLlamadasPorAbogado(mesSel?: number, anioSel?: number): Promise<ResumenAbogado[]> {
  // page.tsx llama esto en paralelo con listarProspectosUnificados (que también lo
  // corre): idempotente por la marca en Configuracion, así que no importa cuál gane.
  await backfillHistorialLlamadas();
  const hoy = hoyDespacho();
  const [anioHoy, mesHoy] = hoy.slice(0, 7).split("-").map(Number);
  const anio = anioSel ?? anioHoy;
  const mes = mesSel ?? mesHoy;
  const esMesActual = anio === anioHoy && mes === mesHoy;

  // Para el mes en curso, "llamadas del mes" son los últimos 30 días (ventana móvil)
  // en vez de desde el día 1 — así no se ve en 0 justo al empezar el mes. Un mes ya
  // cerrado (ej. viendo agosto en septiembre) sigue siendo el mes calendario completo,
  // que es lo que tiene sentido para revisar historial.
  const inicioMes = esMesActual
    ? new Date(new Date(`${hoy}T00:00:00.000Z`).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : `${anio}-${String(mes).padStart(2, "0")}-01`;
  const finMes = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
  const inicioSemana = lunesDe(hoy);
  const inicioSemanaUTC = new Date(`${inicioSemana}T00:00:00.000Z`);
  const inicioSemanaMx = new Date(`${inicioSemana}T00:00:00${OFFSET_DESPACHO}`);
  // fechaContacto se guarda como fecha pura (medianoche UTC, ver el input <input type="date">
  // en client.tsx), así que "hoy" se compara igual, no con hora de México.
  const hoyUTC = new Date(`${hoy}T00:00:00.000Z`);
  const hoyInicioMx = new Date(`${hoy}T00:00:00${OFFSET_DESPACHO}`);

  const [abogados, llamadasMes, agendadasMes, citasMes, contratosMes] = await Promise.all([
    prisma.usuario.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: { sucursal: { select: { nombre: true } } },
    }),
    // Llamadas: vienen del historial (LlamadaProspecto), no del prospecto en sí — así
    // un prospecto que llamó un abogado un día y otro al siguiente cuenta para los dos,
    // en vez de que el segundo sobrescriba el registro del primero.
    prisma.llamadaProspecto.findMany({
      where: {
        fecha: { gte: new Date(`${inicioMes}T00:00:00.000Z`), lt: new Date(`${finMes}T00:00:00.000Z`) },
      },
      select: { abogadoId: true, fecha: true },
    }),
    // Agendadas: sí se queda atada al estado actual del prospecto — solo hay una cita
    // real, y le corresponde a quien la consiguió, no a todo el historial de llamadas.
    prisma.prospecto.findMany({
      where: {
        abogadoId: { not: null },
        estado: "agendo_cita",
        fechaContacto: { gte: new Date(`${inicioMes}T00:00:00.000Z`), lt: new Date(`${finMes}T00:00:00.000Z`) },
      },
      select: { abogadoId: true, fechaContacto: true },
    }),
    prisma.cita.findMany({
      where: {
        abogadoId: { not: null },
        estado: "asesorada",
        fechaHora: { gte: new Date(`${inicioMes}T00:00:00${OFFSET_DESPACHO}`), lt: new Date(`${finMes}T00:00:00${OFFSET_DESPACHO}`) },
      },
      select: { abogadoId: true, fechaHora: true },
    }),
    // Firmaron: fechaFirma es fecha pura (medianoche UTC), como fechaContacto.
    prisma.asesoria.findMany({
      where: {
        abogadoId: { not: null },
        status: "contrato_firmado",
        fechaFirma: { gte: new Date(`${inicioMes}T00:00:00.000Z`), lt: new Date(`${finMes}T00:00:00.000Z`) },
      },
      select: { abogadoId: true, fechaFirma: true },
    }),
  ]);

  const porAbogadoId = new Map<string, ResumenAbogado>(
    abogados.map((a) => [
      a.id,
      {
        abogadoId: a.id,
        nombre: a.nombre,
        sucursalNombre: a.sucursal?.nombre ?? null,
        llamadasMes: 0,
        agendadasMes: 0,
        citasMes: 0,
        contratosMes: 0,
        llamadasSemana: 0,
        agendadasSemana: 0,
        citasSemana: 0,
        contratosSemana: 0,
        llamadasHoy: 0,
        agendadasHoy: 0,
        citasHoy: 0,
        contratosHoy: 0,
      },
    ]),
  );

  for (const l of llamadasMes) {
    const r = porAbogadoId.get(l.abogadoId);
    if (!r) continue;
    r.llamadasMes++;
    if (l.fecha >= inicioSemanaUTC) r.llamadasSemana++;
    if (l.fecha.getTime() === hoyUTC.getTime()) r.llamadasHoy++;
  }

  for (const p of agendadasMes) {
    const r = p.abogadoId ? porAbogadoId.get(p.abogadoId) : undefined;
    if (!r) continue;
    r.agendadasMes++;
    if (p.fechaContacto && p.fechaContacto >= inicioSemanaUTC) r.agendadasSemana++;
    if (p.fechaContacto && p.fechaContacto.getTime() === hoyUTC.getTime()) r.agendadasHoy++;
  }

  for (const c of citasMes) {
    const r = c.abogadoId ? porAbogadoId.get(c.abogadoId) : undefined;
    if (!r) continue;
    r.citasMes++;
    if (c.fechaHora >= inicioSemanaMx) r.citasSemana++;
    if (c.fechaHora >= hoyInicioMx) r.citasHoy++;
  }

  for (const f of contratosMes) {
    const r = f.abogadoId ? porAbogadoId.get(f.abogadoId) : undefined;
    if (!r || !f.fechaFirma) continue;
    r.contratosMes++;
    if (f.fechaFirma >= inicioSemanaUTC) r.contratosSemana++;
    if (f.fechaFirma.getTime() === hoyUTC.getTime()) r.contratosHoy++;
  }

  return Array.from(porAbogadoId.values());
}

// Para el bot externo: prospectos marcados "no contestó" pendientes de la plantilla
// de reintento. El CRON, tras enviar el WhatsApp, hace PATCH con
// estado: "mensaje_automatico" — con eso solo, la próxima corrida ya no los vuelve
// a traer (deja de calificar para estado: "no_contesto").
// Tope por costos de Meta (plantilla de WhatsApp cobra por envío): a lo más este
// número de prospectos por día, sin importar cuántas corridas del CRON pasen.
const LIMITE_DIARIO_NO_CONTESTO = 30;

// Solo el "no contestó" de HOY (fechaContacto = hoy): el estado existe desde antes de
// este CRON y hay ~350 registros viejos acumulados desde agosto — mandarles la
// plantilla a todos de golpe reviviría leads fríos de semanas. Empieza acotado a los
// de hoy; si se quiere ampliar a un rango de días, es este filtro el que hay que tocar.
//
// El tope de 30/día se calcula contando cuántos ya se marcaron "mensaje_automatico"
// hoy (actualizadoEn de hoy) — así, si una corrida ya mandó 30, las siguientes del
// mismo día no vuelven a mandar aunque queden más "no_contesto" nuevos.
export async function listarProspectosNoContesto() {
  const hoy = new Date(`${hoyDespacho()}T00:00:00.000Z`);
  const inicioHoy = new Date(`${hoyDespacho()}T00:00:00${OFFSET_DESPACHO}`);
  const yaEnviadosHoy = await prisma.prospecto.count({
    where: { estado: "mensaje_automatico", actualizadoEn: { gte: inicioHoy } },
  });
  const cupo = LIMITE_DIARIO_NO_CONTESTO - yaEnviadosHoy;
  if (cupo <= 0) return [];

  return prisma.prospecto.findMany({
    where: {
      estado: "no_contesto",
      telefono: { not: null },
      fechaContacto: hoy,
    },
    orderBy: { creadoEn: "asc" },
    take: cupo,
  });
}

export async function listarProspectos(filtros?: {
  ciudad?: string;
  estado?: string;
  mes?: number;
  anio?: number;
  abogadoId?: string;
}) {
  const anio = filtros?.anio ?? 2026;
  const mes = filtros?.mes;
  const fechaFiltro =
    mes !== undefined
      ? {
          gte: new Date(Date.UTC(anio, mes - 1, 1)),
          lt: new Date(Date.UTC(anio, mes, 1)),
        }
      : undefined;

  // El mes filtra por cuándo se le llamó (fechaContacto) si ya se le llamó; si no, por
  // cuándo se registró (fechaLlamada). Sin este OR, un prospecto registrado en agosto
  // pero contactado hoy en septiembre desaparecía del filtro "Septiembre" aunque el
  // trabajo real (la llamada, el mensaje automático) haya sido hoy.
  const fechaWhere = fechaFiltro
    ? {
        OR: [
          { fechaContacto: fechaFiltro },
          { AND: [{ fechaContacto: null }, { fechaLlamada: fechaFiltro }] },
        ],
      }
    : {};

  return prisma.prospecto.findMany({
    where: {
      ...(filtros?.ciudad && { ciudad: filtros.ciudad }),
      ...(filtros?.estado && { estado: filtros.estado }),
      ...(filtros?.abogadoId && { abogadoId: filtros.abogadoId }),
      ...fechaWhere,
    },
    include: {
      abogado: { select: { id: true, nombre: true } },
      llamadas: { include: { abogado: { select: { nombre: true } } }, orderBy: { fecha: "asc" } },
    },
    orderBy: [{ fechaLlamada: "desc" }, { creadoEn: "desc" }],
  });
}

// Los dos embudos viven en tablas distintas: `prospectos` (bot de llamadas) y las
// asesorías de quien todavía no firma. En vez de copiar filas de un lado al otro,
// la pantalla los junta al leer. La asesoría se sigue editando en su pantalla.
const STATUS_ASESORIA_A_ESTADO: Record<string, string> = {
  pendiente: "por_contactar",
  contrato_firmado: "convertido",
  no_regreso: "llamar_despues",
  descartado: "descartado",
};

export type FilaProspectoUnificada = {
  id: string;
  origen: "llamada" | "asesoria";
  /** Solo en las de asesoría: para abrir el expediente sin crear otro cliente. */
  clienteId: string | null;
  nombre: string;
  telefono: string | null;
  ciudad: string | null;
  asunto: string | null;
  estado: string;
  nota: string | null;
  fecha: Date | null;
  fechaContacto: Date | null;
  abogadoId: string | null;
  abogadoNombre: string | null;
  /** Vacío para las de origen "asesoria" (esas no tienen LlamadaProspecto). */
  historial: { fecha: Date; abogadoNombre: string }[];
};

// Una sola vez: del 10-sep-2026 para atrás, fecha de llamada = fecha de registro. Un
// backfill anterior les puso 2026-09-11 a todas; eso también se corrige aquí. Del 11
// en adelante se queda vacía hasta que el abogado la anote. Se marca en
// Configuracion.preferencias para no volver a correr y no pisar capturas reales.
// ponytail: borrar esta función cuando ya haya corrido en producción.
const MARCA_BACKFILL = "backfillFechaContacto20260910";

async function backfillFechaContactoInicial() {
  const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
  const prefs = (config?.preferencias ?? {}) as Record<string, unknown>;
  if (prefs[MARCA_BACKFILL]) return;

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE prospectos
      SET fecha_contacto = fecha_llamada
      WHERE fecha_llamada <= '2026-09-10'
        AND (fecha_contacto IS NULL OR fecha_contacto = '2026-09-11')
    `,
    prisma.configuracion.upsert({
      where: { id: 1 },
      create: { id: 1, nombreDespacho: "Villafuerte y Asociados", preferencias: { [MARCA_BACKFILL]: true } },
      update: { preferencias: { ...prefs, [MARCA_BACKFILL]: true } },
    }),
  ]);
}

// Una sola vez: prospectos con abogado ya asignado pero fecha de llamada vacía (el
// abogado se autoasignó desde el selector antes de que ese selector pusiera la fecha
// sola, ver el fix en client.tsx) no contaban en "Llamadas por abogado" aunque ya
// estuvieran atendidos. Se les pone la fecha de hoy para que empiecen a contar.
// ponytail: borrar esta función cuando ya haya corrido en producción.
const MARCA_BACKFILL_ABOGADO_SIN_FECHA = "backfillFechaContactoAbogadoSinFecha20260914";

async function backfillFechaContactoAbogadoSinFecha() {
  const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
  const prefs = (config?.preferencias ?? {}) as Record<string, unknown>;
  if (prefs[MARCA_BACKFILL_ABOGADO_SIN_FECHA]) return;

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE prospectos
      SET fecha_contacto = ${hoyDespacho()}::date
      WHERE abogado_id IS NOT NULL AND fecha_contacto IS NULL
    `,
    prisma.configuracion.upsert({
      where: { id: 1 },
      create: { id: 1, nombreDespacho: "Villafuerte y Asociados", preferencias: { [MARCA_BACKFILL_ABOGADO_SIN_FECHA]: true } },
      update: { preferencias: { ...prefs, [MARCA_BACKFILL_ABOGADO_SIN_FECHA]: true } },
    }),
  ]);
}

// Una sola vez: antes de existir LlamadaProspecto, cada prospecto solo guardaba su
// última llamada (abogado_id + fecha_contacto). Sin este backfill, todas esas llamadas
// ya hechas desaparecerían del conteo por abogado hasta que alguien las vuelva a tocar.
// ponytail: borrar esta función cuando ya haya corrido en producción.
const MARCA_BACKFILL_HISTORIAL_LLAMADAS = "backfillHistorialLlamadas20260915";

async function backfillHistorialLlamadas() {
  const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
  const prefs = (config?.preferencias ?? {}) as Record<string, unknown>;
  if (prefs[MARCA_BACKFILL_HISTORIAL_LLAMADAS]) return;

  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO llamadas_prospecto (id, prospecto_id, abogado_id, fecha, creado_en)
      SELECT gen_random_uuid(), id, abogado_id, fecha_contacto, now()
      FROM prospectos
      WHERE abogado_id IS NOT NULL AND fecha_contacto IS NOT NULL
      ON CONFLICT (prospecto_id, abogado_id, fecha) DO NOTHING
    `,
    prisma.configuracion.upsert({
      where: { id: 1 },
      create: { id: 1, nombreDespacho: "Villafuerte y Asociados", preferencias: { [MARCA_BACKFILL_HISTORIAL_LLAMADAS]: true } },
      update: { preferencias: { ...prefs, [MARCA_BACKFILL_HISTORIAL_LLAMADAS]: true } },
    }),
  ]);
}

export async function listarProspectosUnificados(
  filtros: { ciudad?: string; estado?: string; mes?: number; anio?: number; abogadoId?: string },
  alcance: Alcance,
) {
  await backfillFechaContactoInicial();
  await backfillFechaContactoAbogadoSinFecha();
  await backfillHistorialLlamadas();
  const anio = filtros.anio ?? new Date().getFullYear();
  const mes = filtros.mes;
  const rango =
    mes !== undefined
      ? { gte: new Date(Date.UTC(anio, mes - 1, 1)), lt: new Date(Date.UTC(anio, mes, 1)) }
      : undefined;

  // Filtrar por un estado que ninguna asesoría puede tener (no_contesto, agendo_cita)
  // deja fuera a todas: no hay status equivalente.
  const statusBuscado = filtros.estado
    ? Object.keys(STATUS_ASESORIA_A_ESTADO).find((s) => STATUS_ASESORIA_A_ESTADO[s] === filtros.estado)
    : undefined;
  const pedirAsesorias = !filtros.estado || statusBuscado !== undefined;

  const [llamadas, asesorias] = await Promise.all([
    listarProspectos(filtros),
    pedirAsesorias
      ? prisma.asesoria.findMany({
          where: {
            AND: [
              // Prospecto = sin expediente todavía, ni propio ni del cliente.
              { expedienteId: null },
              { OR: [{ clienteId: null }, { cliente: { expedientes: { none: {} } } }] },
              porAbogado(alcance),
              ...(rango ? [{ fecha: rango }] : []),
              ...(statusBuscado ? [{ status: statusBuscado }] : []),
              ...(filtros.abogadoId ? [{ abogadoId: filtros.abogadoId }] : []),
              // La ciudad del bot es texto libre; la de una asesoría es su sucursal.
              ...(filtros.ciudad ? [{ sucursal: { nombre: { contains: filtros.ciudad, mode: "insensitive" as const } } }] : []),
            ],
          },
          include: { cliente: { select: { id: true } }, sucursal: { select: { nombre: true } } },
          orderBy: { fecha: "desc" },
        })
      : [],
  ]);

  const filas: FilaProspectoUnificada[] = [
    ...llamadas.map((p) => ({
      id: p.id,
      origen: "llamada" as const,
      clienteId: null,
      nombre: p.nombre,
      telefono: p.telefono,
      ciudad: p.ciudad,
      asunto: p.asunto,
      estado: p.estado,
      nota: p.nota,
      fecha: p.fechaLlamada,
      fechaContacto: p.fechaContacto,
      abogadoId: p.abogadoId,
      abogadoNombre: p.abogado?.nombre ?? null,
      historial: p.llamadas.map((l) => ({ fecha: l.fecha, abogadoNombre: l.abogado.nombre })),
    })),
    ...asesorias.map((a) => ({
      id: a.id,
      origen: "asesoria" as const,
      clienteId: a.cliente?.id ?? null,
      nombre: a.nombre ?? "—",
      telefono: a.telefono,
      ciudad: a.sucursal?.nombre ?? null,
      asunto: a.tema,
      estado: STATUS_ASESORIA_A_ESTADO[a.status] ?? "por_contactar",
      nota: a.seguimiento ?? a.resumen,
      fecha: a.fecha,
      fechaContacto: null,
      abogadoId: null,
      abogadoNombre: null,
      historial: [],
    })),
  ];

  return filas.sort((x, y) => (y.fecha?.getTime() ?? 0) - (x.fecha?.getTime() ?? 0));
}

export type ProspectoRow = {
  id: string;
  origen: "llamada" | "asesoria";
  clienteId: string | null;
  nombre: string;
  telefono: string;
  ciudad: string;
  asunto: string;
  estado: string;
  nota: string;
  fechaRegistro: string;
  fechaContacto: string;
  abogadoId: string | null;
  historial: { fecha: string; abogadoNombre: string }[];
};

// Usado tanto por la carga inicial (page.tsx) como por el polling en vivo (api/prospectos/live):
// misma forma de fila para los dos, para no tener dos lugares donde se pueda desalinear el formato.
export function mapProspectosRows(rows: FilaProspectoUnificada[]): ProspectoRow[] {
  return rows.map((p) => ({
    id: p.id,
    origen: p.origen,
    clienteId: p.clienteId,
    nombre: p.nombre,
    telefono: p.telefono ?? "—",
    ciudad: p.ciudad ?? "—",
    asunto: p.asunto ?? "—",
    estado: p.estado,
    nota: p.nota ?? "",
    // p.fecha viene de columnas @db.Date (fechaLlamada / Asesoria.fecha): son fecha
    // pura sin hora, Prisma las devuelve como medianoche UTC. Formatear con TZ México
    // les resta 6h y las manda al día anterior — deben mostrarse en UTC tal cual.
    fechaRegistro: p.fecha
      ? p.fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" })
      : "—",
    fechaContacto: p.fechaContacto ? p.fechaContacto.toISOString().split("T")[0] : "",
    abogadoId: p.abogadoId,
    historial: p.historial.map((h) => ({
      fecha: h.fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }),
      abogadoNombre: h.abogadoNombre,
    })),
  }));
}
