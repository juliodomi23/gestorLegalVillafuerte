// Quien toma una cita queda fijo 24 h: sin esto cualquiera se la quita a quien ya la agendó.
// Aplica a todos, admin incluido.
const HORAS_BLOQUEO = 24;

export function abogadoBloqueado(abogadoId: string | null, asignadoEn: Date | null): boolean {
  if (!abogadoId || !asignadoEn) return false;
  return Date.now() - asignadoEn.getTime() < HORAS_BLOQUEO * 3600_000;
}

export const MENSAJE_BLOQUEO = "El abogado de esta cita no se puede cambiar hasta 24 horas después de asignarlo.";
