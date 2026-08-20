// Crea el evento en Google Calendar pidiéndoselo al n8n del despacho, que ya
// tiene las credenciales de Calendar configuradas (workflow "[WEBHOOK] GestorLegal -
// Crear Cita en Calendar"). No lanza: una cita se puede guardar en GestorLegal
// aunque esta llamada falle.
export async function crearEventoCalendar(datos: {
  cliente: string;
  telefono?: string;
  asunto?: string;
  sucursal?: string;
  inicio: Date;
}): Promise<string | null> {
  const url = process.env.N8N_CALENDAR_WEBHOOK_URL;
  const apiKey = process.env.N8N_CALENDAR_WEBHOOK_KEY;
  if (!url || !apiKey) {
    // Sin esto el fallo es invisible: la cita se guarda sin evento y nadie se entera.
    console.warn(
      "[calendar] N8N_CALENDAR_WEBHOOK_URL/KEY sin definir: la cita se guarda sin evento en Calendar"
    );
    return null;
  }

  const fin = new Date(datos.inicio.getTime() + 30 * 60_000); // igual que ver_disponibilidad en n8n

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        cliente: datos.cliente,
        telefono: datos.telefono,
        asunto: datos.asunto,
        sucursal: datos.sucursal,
        fecha_hora_inicio: datos.inicio.toISOString(),
        fecha_hora_fin: fin.toISOString(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.googleEventId) {
      console.error("n8n no pudo crear el evento en Calendar:", data);
      return null;
    }
    return data.googleEventId as string;
  } catch (e) {
    console.error("Error llamando al webhook de Calendar en n8n:", e);
    return null;
  }
}
