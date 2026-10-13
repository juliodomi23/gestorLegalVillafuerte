export const AHORA = new Date("2026-10-13T18:00:00-06:00");

export function crearMensaje(id, contenido, fecha, direccion = "entrante", extra = {}) {
  return { id, direccion, contenido, timestamp: new Date(fecha).toISOString(), tipo: "texto", status: direccion === "saliente" ? "leido" : "entregado", errorDetalle: null, privado: false, tieneMedia: false, mediaMime: null, mediaNombre: null, ...extra };
}

export function crearEscenario() {
  const largo = [];
  for (const dia of [3, 9, 12, 13]) {
    for (let indice = 0; indice < 24; indice++) {
      largo.push(crearMensaje(`largo-${dia}-${indice}`, indice % 4 < 2 ? "Le comparto la actualización del expediente. Estamos revisando los documentos de su asunto." : "Muchas gracias. Quedo pendiente de la confirmación de la cita.", `2026-10-${String(dia).padStart(2, "0")}T09:${String(indice).padStart(2, "0")}:00-06:00`, indice % 4 < 2 ? "saliente" : "entrante"));
    }
  }
  largo.push(
    crearMensaje("reciente-1", "Hola, ¿ya podemos confirmar la cita de mañana?", "2026-10-13T17:42:00-06:00"),
    crearMensaje("reciente-2", "Tengo listos los documentos que me solicitaron.", "2026-10-13T17:43:00-06:00"),
    crearMensaje("reciente-3", "Sí, Mariana. La cita es mañana a las 11:00.\nLe atenderá la Lic. Elena Ruiz.", "2026-10-13T17:44:00-06:00", "saliente"),
    crearMensaje("reciente-4", "Puede consultar los requisitos aquí:\nhttps://example.test/documentos", "2026-10-13T17:45:00-06:00", "saliente", { status: "entregado" }),
    crearMensaje("reciente-5", "Confirmar identificación y comprobante antes de la cita.", "2026-10-13T17:46:00-06:00", "saliente", { privado: true }),
    crearMensaje("reciente-6", "Recordatorio de la cita", "2026-10-13T17:47:00-06:00", "saliente", { status: "fallido", errorDetalle: "Meta 131042: No se pudo enviar por un problema con la forma de pago de la cuenta." }),
    crearMensaje("reciente-7", "Perfecto, muchas gracias. Nos vemos mañana.", "2026-10-13T17:48:00-06:00"),
    crearMensaje("reciente-8", "Aquí está la referencia: " + "ABC0123456789".repeat(14), "2026-10-13T17:49:00-06:00"),
  );
  const adjuntos = largo.slice(0, 35).map((m) => ({ ...m, id: `media-${m.id}` }));
  adjuntos.push(
    crearMensaje("adjunto-saludo", "Buen día. Le envío la documentación y una nota de voz.", "2026-10-13T17:30:00-06:00"),
    crearMensaje("adjunto-imagen", "Documento de referencia · demostración", "2026-10-13T17:31:00-06:00", "entrante", { tieneMedia: true, tipo: "imagen", mediaMime: "image/svg+xml", mediaNombre: "documento-demo.svg" }),
    crearMensaje("adjunto-audio", null, "2026-10-13T17:32:00-06:00", "entrante", { tieneMedia: true, tipo: "audio", mediaMime: "audio/wav", mediaNombre: "nota-demo.wav" }),
    crearMensaje("adjunto-respuesta", "Recibido. Revisamos los documentos y le confirmamos el siguiente paso.", "2026-10-13T17:33:00-06:00", "saliente", { status: "enviado" }),
  );
  const cerrada = [crearMensaje("cerrada-1", "¿Podrían volver a contactarme?", "2026-10-10T12:00:00-06:00")];
  const historiales = { largo, adjuntos, cerrada, vacia: [] };
  const base = { estado: "abierta", canalId: "demo", canalNombre: "WhatsApp Despacho", canalActivo: true, responsable: { id: "asesora", nombre: "Lic. Elena Ruiz" }, etiquetas: [], requiereAtencion: false, vinculo: null, noLeidos: 0 };
  const conversaciones = [
    { ...base, id: "largo", numero: 9101, contacto: { nombre: "Mariana López Demo", telefono: "+52 961 555 0101" }, noLeidos: 3, etapa: { id: "cita", nombre: "Cita agendada", color: "#3F6B4F" } },
    { ...base, id: "adjuntos", numero: 9102, contacto: { nombre: "Daniela Méndez Demo", telefono: "+52 961 555 0103" }, responsable: null, requiereAtencion: true, etiquetas: [{ nombre: "bot_off", color: "#96700F" }, { nombre: "requiere_atencion", color: "#9B2C2C" }], etapa: { id: "contactado", nombre: "Contactado", color: "#1E3A5F" } },
    { ...base, id: "cerrada", numero: 9103, contacto: { nombre: "Óscar Robles Demo", telefono: "+52 961 555 0104" }, etapa: { id: "nuevo", nombre: "Nuevo", color: "#6B6259" } },
    { ...base, id: "vacia", numero: 9104, contacto: { nombre: "Laura Sánchez Demo", telefono: "+52 961 555 0105" }, etapa: null },
  ];
  return { historiales, conversaciones };
}

export const IMAGEN = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#e7e0d4"/><rect x="122" y="32" width="396" height="356" rx="8" fill="#fff"/><rect x="158" y="68" width="54" height="54" rx="8" fill="#1e3a5f"/><text x="234" y="89" font-family="sans-serif" font-size="18" fill="#1e3a5f">DOCUMENTACIÓN</text><text x="234" y="113" font-family="sans-serif" font-size="13" fill="#6b6259">Datos ficticios para prueba visual</text><path d="M158 155h324M158 185h290M158 215h324M158 245h242M158 275h324" stroke="#e7e0d4" stroke-width="10"/><text x="158" y="348" font-family="sans-serif" font-size="14" fill="#6b6259">GestorLegal · Demostración</text></svg>`;

export function audioDemo() {
  const muestras = 8000 * 2;
  const buffer = Buffer.alloc(44 + muestras * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(muestras * 2, 40);
  return buffer;
}
