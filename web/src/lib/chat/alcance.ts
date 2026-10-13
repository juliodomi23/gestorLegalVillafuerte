// Quién ve qué en el chat. Sin base de datos ni alias de rutas: se prueba con node --test.
export type Alcance = "todas" | "recepcion" | "propias";

// Etiquetas con las que un bot (o una persona) avisa que un humano debe atender.
export const ETIQUETAS_ATENCION = ["escalado_humano", "bot_off", "requiere_atencion"] as const;
export const ESTADOS_ABIERTOS = ["abierta", "pendiente"] as const;

// - admin: todas.
// - recepción: quien tiene el permiso "Chat: recepción" (verChatRecepcion): ve todas
//   las conversaciones y puede reasignarlas a un abogado.
// - el resto: solo las conversaciones asignadas a ellos.
export function alcanceDe(usuario: { rol: string; verChatRecepcion: boolean }): Alcance {
  if (usuario.rol === "admin") return "todas";
  return usuario.verChatRecepcion ? "recepcion" : "propias";
}

// Debe coincidir con filtroConversaciones() de acceso.ts, que es la versión de base de datos.
export function requiereAtencion(c: { estado: string; responsableId: string | null; etiquetas: string[] }): boolean {
  if (c.responsableId) return false;
  if (!(ESTADOS_ABIERTOS as readonly string[]).includes(c.estado)) return false;
  return c.estado === "pendiente" || c.etiquetas.some((nombre) => (ETIQUETAS_ATENCION as readonly string[]).includes(nombre));
}

export function puedeReasignar(alcance: Alcance): boolean {
  return alcance !== "propias";
}
