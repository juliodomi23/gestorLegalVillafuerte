// Mantiene el Google Calendar del despacho en sincronía con la agenda, pidiéndoselo
// al n8n del despacho, que es quien tiene las credenciales de Calendar (workflow
// "[WEBHOOK] GestorLegal - Citas en Calendar (crear/actualizar/borrar)").
//
// Nada de esto lanza: la agenda es la fuente de verdad y una cita se guarda, se mueve
// o se borra aunque Calendar no responda. Lo que sí hace es dejar rastro en el log,
// porque un fallo mudo aquí significa un calendario desincronizado que nadie nota.

const DURACION_CITA_MIN = 30; // igual que ver_disponibilidad en n8n

type DatosEvento = {
  cliente: string;
  telefono?: string;
  asunto?: string;
  sucursal?: string;
  inicio: Date;
};

type Accion = "crear" | "actualizar" | "borrar";

async function pedirACalendar(
  accion: Accion,
  cuerpo: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const url = process.env.N8N_CALENDAR_WEBHOOK_URL;
  const apiKey = process.env.N8N_CALENDAR_WEBHOOK_KEY;
  if (!url || !apiKey) {
    console.warn(
      `[calendar] N8N_CALENDAR_WEBHOOK_URL/KEY sin definir: no se pudo ${accion} el evento`
    );
    return null;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ accion, ...cuerpo }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[calendar] n8n no pudo ${accion} el evento:`, data);
      return null;
    }
    return data;
  } catch (e) {
    console.error(`[calendar] error llamando al webhook de n8n para ${accion}:`, e);
    return null;
  }
}

function cuerpoEvento(datos: DatosEvento) {
  const fin = new Date(datos.inicio.getTime() + DURACION_CITA_MIN * 60_000);
  return {
    cliente: datos.cliente,
    telefono: datos.telefono,
    asunto: datos.asunto,
    sucursal: datos.sucursal,
    fecha_hora_inicio: datos.inicio.toISOString(),
    fecha_hora_fin: fin.toISOString(),
  };
}

// Devuelve el id del evento creado, o null si no se pudo.
export async function crearEventoCalendar(datos: DatosEvento): Promise<string | null> {
  const data = await pedirACalendar("crear", cuerpoEvento(datos));
  if (!data?.googleEventId) {
    if (data) console.error("[calendar] respuesta sin googleEventId:", data);
    return null;
  }
  return data.googleEventId as string;
}

// Mueve o reescribe un evento ya existente. Sin googleEventId no hay nada que actualizar
// (la cita nunca llegó a Calendar), así que se crea uno nuevo y se devuelve su id.
export async function actualizarEventoCalendar(
  googleEventId: string | null,
  datos: DatosEvento
): Promise<string | null> {
  if (!googleEventId) return crearEventoCalendar(datos);
  const data = await pedirACalendar("actualizar", {
    google_event_id: googleEventId,
    ...cuerpoEvento(datos),
  });
  return data ? googleEventId : null;
}

// Borra el evento del calendario. Se llama ANTES de borrar la cita de la base:
// después ya no se sabría qué evento le correspondía y quedaría huérfano para siempre.
export async function borrarEventoCalendar(
  googleEventId: string | null,
  sucursal?: string
): Promise<void> {
  if (!googleEventId) return;
  await pedirACalendar("borrar", { google_event_id: googleEventId, sucursal });
}
