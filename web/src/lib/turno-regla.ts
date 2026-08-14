// Orden del turno rotativo de asesorías en Tuxtla: llega una asesoría, le toca al
// siguiente de la lista. Los nombres se buscan por palabras completas contra
// `usuarios.nombre`, así que basta con que sean suficientes para identificar a la
// persona ("Alain" encuentra a "Alain Aquiahuatl Gomez"); van completos para que no
// haya duda si mañana entra alguien con el mismo nombre de pila.
export const TURNO_TUXTLA = [
  "Alain Aquiahuatl Gomez",
  "Estrella Fabiola Sanchez Vives",
  "Maria del Rosario Alvarez Vera",
  "Fernando Salas",
  "Carolina Velazquez",
  "Karla Giselle Villafuerte De Paz",
];

const palabras = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);

// Por palabras completas y no `includes` para que "Rosa" no case con "Rosario".
export function coincideNombre(nombreCompleto: string, clave: string): boolean {
  const tokens = palabras(nombreCompleto);
  return palabras(clave).every((p) => tokens.includes(p));
}

// Le toca al siguiente del que atendió la última asesoría de Tuxtla. Se deriva de la
// última asesoría en vez de guardar un contador: así no hay estado que se desincronice
// si se borra una, se reasigna, o recepción se salta a alguien que no estaba disponible
// (el saltado pierde su turno; el turno sigue desde quien sí atendió).
export function siguienteDelTurno(turno: string[], ultimoAbogado: string | null): string | null {
  if (turno.length === 0) return null;
  const i = ultimoAbogado ? turno.indexOf(ultimoAbogado) : -1;
  return turno[(i + 1) % turno.length];
}
