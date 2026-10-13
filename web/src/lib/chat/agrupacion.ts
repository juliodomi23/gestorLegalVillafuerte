type MensajeAgrupable = { timestamp: string; direccion: string; privado: boolean };

// La API identifica al remitente por dirección, sin exponer al usuario que lo envió.
export function agruparMensajes<T extends MensajeAgrupable>(mensajes: T[]): T[][] {
  const grupos: T[][] = [];
  for (const mensaje of mensajes) {
    const grupo = grupos[grupos.length - 1];
    const anterior = grupo?.[grupo.length - 1];
    const fecha = new Date(mensaje.timestamp);
    const previa = anterior && new Date(anterior.timestamp);
    const diferencia = previa ? fecha.getTime() - previa.getTime() : Infinity;
    if (anterior && anterior.direccion === mensaje.direccion && anterior.privado === mensaje.privado &&
        fecha.toDateString() === previa?.toDateString() && diferencia >= 0 && diferencia <= 5 * 60_000) {
      grupo.push(mensaje);
    } else {
      grupos.push([mensaje]);
    }
  }
  return grupos;
}
