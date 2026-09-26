// Reglas puras del tablero de citas y de los no-shows (sin base de datos, para poder
// probarlas con node). El despacho no marca en GestorLegal quién llegó: "llegó" =
// ese día se registró una asesoría que casa con la cita por teléfono o por nombre.

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

export type AsesoriaDelDia = { nombre?: string | null; telefono?: string | null };
export type CitaBasica = { nombre: string; telefono?: string | null };

// Cotejar por nombre además del teléfono importa porque muchas citas del bot traen
// el teléfono metido dentro del nombre y el campo teléfono vacío.
export function crearDetectorLlegada(asesorias: AsesoriaDelDia[]) {
  const telefonos = new Set(
    asesorias.map((a) => normalizarTelefono(a.telefono)).filter((t) => t.length === 10)
  );
  const nombres = asesorias.map((a) => normalizarNombre(a.nombre)).filter((n) => n.length >= 5);

  return (c: CitaBasica): boolean => {
    const tel = normalizarTelefono(c.telefono);
    const telEnNombre = normalizarTelefono(c.nombre.replace(/\D/g, "").slice(-10));
    if (tel.length === 10 && telefonos.has(tel)) return true;
    if (telEnNombre.length === 10 && telefonos.has(telEnNombre)) return true;
    const n = normalizarNombre(c.nombre);
    return n.length >= 5 && nombres.some((a) => a.includes(n) || n.includes(a));
  };
}

// Una asesoría registrada confirma que la persona sí acudió, incluso si en Agenda
// nadie alcanzó a cambiar manualmente el estado de la cita a "asesorada".
// Una baja o no-show explícito conserva prioridad para no revivir una cita cerrada.
export function citaFueAtendida(
  cita: CitaBasica & { estado: string },
  detectarLlegada: ReturnType<typeof crearDetectorLlegada>
): boolean {
  if (cita.estado === "cancelada" || cita.estado === "no_show") return false;
  return cita.estado === "asesorada" || detectarLlegada(cita);
}

export type CitaParaContar = CitaBasica & {
  fechaDia: string; // yyyy-MM-dd, en hora del despacho
  estado: string;
};

export type ConteoCitas = {
  agendadas: number;
  asistieron: number;
  noLlegaron: number;
  canceladas: number;
  porVenir: number;
};

// Canceladas son bajas, no ausencias. Hoy y días futuros quedan como "por venir": el
// día de hoy todavía puede registrarse la asesoría de quien ya vino, y contarlo como
// "no llegó" antes de que termine el día daría números falsos.
export function contarCitas(
  citas: CitaParaContar[],
  asesoriasPorDia: Record<string, AsesoriaDelDia[]>,
  hoy: string
): ConteoCitas {
  const conteo: ConteoCitas = { agendadas: citas.length, asistieron: 0, noLlegaron: 0, canceladas: 0, porVenir: 0 };
  const detectores: Record<string, ReturnType<typeof crearDetectorLlegada>> = {};

  for (const c of citas) {
    if (c.estado === "cancelada") conteo.canceladas++;
    else if (c.fechaDia >= hoy) conteo.porVenir++;
    else {
      detectores[c.fechaDia] ??= crearDetectorLlegada(asesoriasPorDia[c.fechaDia] ?? []);
      if (detectores[c.fechaDia](c)) conteo.asistieron++;
      else conteo.noLlegaron++;
    }
  }
  return conteo;
}

// % de asistencia sobre las citas ya vencidas; null si todavía no hay ninguna.
export function tasaAsistencia(c: ConteoCitas): number | null {
  const vencidas = c.asistieron + c.noLlegaron;
  return vencidas === 0 ? null : Math.round((c.asistieron * 100) / vencidas);
}
