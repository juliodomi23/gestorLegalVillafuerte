// Quién recibe cada pregunta de Productividad y cuánto tiempo tiene para contestarla.
// Sin imports para poder probarlo con `node --experimental-strip-types`.

export const LIMITE_RESPUESTA_MIN = 20;
// El CRON corre cada 10 min: una pregunta se manda si su hora ya pasó hace menos de esto,
// para que al trabajador le queden siempre varios minutos de sus 20.
export const VENTANA_ENVIO_MIN = 15;

const COORDINADORES = ["Maria del Rosario Alvarez Vera", "Alain Aquiahuatl Gomez", "Yazuri Concepcion Mendoza Citalan"];

// ponytail: el destinatario se deduce del texto de la actividad (así lo redactó el despacho);
// si el texto cambia mucho, conviene una columna `destinatario` en ActividadPlantilla.
const COLABORADORES = ["Carolina", "Giselle", "Fernando Salas"];

// Los textos empiezan con "Preguntar a ..." / "Escribir a ...": el destinatario va justo ahí.
// Se mira el inicio porque el resto del texto nombra a otros (p. ej. "...mandó a la secretaria
// general" o "...pasaron los datos al director") y confundiría.
export function destinatariosDe(descripcion: string): string[] {
  if (/Fernando Salas/i.test(descripcion)) return ["Fernando Salas"];
  if (/^\W*\w+ al (lic\.?|licenciado) Villafuerte/i.test(descripcion)) return ["Christian"];
  if (/^\W*\w+ a la secretaria general/i.test(descripcion)) return ["Karen"];
  if (/^\W*\w+ a los colaboradores/i.test(descripcion)) return COLABORADORES;
  if (/director/i.test(descripcion)) return ["Christian"];
  if (/coordinadores/i.test(descripcion)) return COORDINADORES;
  return [];
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function tocaEnviar(horaPregunta: string, horaAhora: string): boolean {
  const pasados = aMinutos(horaAhora) - aMinutos(horaPregunta);
  return pasados >= 0 && pasados < VENTANA_ENVIO_MIN;
}

export function dentroDeTiempo(enviadoEn: Date, ahora: Date): boolean {
  return ahora.getTime() - enviadoEn.getTime() <= LIMITE_RESPUESTA_MIN * 60_000;
}
