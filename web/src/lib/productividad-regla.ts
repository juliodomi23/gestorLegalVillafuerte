// Cumplimiento de las encuestas de Productividad, por persona y por grupo.
// Sin imports, para probarlo con `node --experimental-strip-types` (igual que equipos-prospectos.ts).
//
// "Cumplió" = contestó Sí. Un No y un "Sin respuesta" cuentan como no cumplido
// (lo confirmó la Lic. Amairany el 2026-09-30), pero se muestran aparte.

export type Respuesta = "si" | "no" | "sin_respuesta";

// Grupos que definió la Lic. Amairany. Quien no esté aquí no entra a la estadística.
// Nombres como en Usuarios; "Christian" y "Karen" se guardan solo con nombre de pila.
const GRUPOS: { label: string; nombres: string[] }[] = [
  {
    label: "Coordinadores",
    nombres: ["Alain Aquiahuatl Gomez", "Estrella Fabiola Sanchez Vives", "Maria del Rosario Alvarez Vera", "Fernando Salas"],
  },
  {
    label: "Colaboradores",
    nombres: ["Carolina Velazquez", "Karla Giselle Villafuerte De Paz"],
  },
  { label: "Secretaría general", nombres: ["Karen"] },
  { label: "Directo", nombres: ["Christian"] },
];

const palabras = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
function coincideNombre(nombreCompleto: string, clave: string): boolean {
  const tokens = palabras(nombreCompleto);
  return palabras(clave).every((p) => tokens.includes(p));
}

export type Conteo = {
  si: number;
  no: number;
  sinRespuesta: number;
  total: number;
  /** null cuando todavía no hay respuestas: no es lo mismo que 0 %. */
  porcentaje: number | null;
};

export type PersonaResumen = { nombre: string; conteo: Conteo };
export type GrupoResumen = { label: string; conteo: Conteo; personas: PersonaResumen[] };

const vacio = (): Conteo => ({ si: 0, no: 0, sinRespuesta: 0, total: 0, porcentaje: null });

function sumar(c: Conteo, r: Respuesta) {
  if (r === "si") c.si++;
  else if (r === "no") c.no++;
  else c.sinRespuesta++;
  c.total++;
  c.porcentaje = Math.round((c.si / c.total) * 100);
}

export function resumirCumplimiento(filas: { nombre: string; respuesta: Respuesta }[]): GrupoResumen[] {
  return GRUPOS.map((g) => {
    const personas: PersonaResumen[] = g.nombres.map((clave) => ({
      nombre: clave,
      conteo: vacio(),
    }));
    const conteo = vacio();
    for (const f of filas) {
      const i = g.nombres.findIndex((clave) => coincideNombre(f.nombre, clave));
      if (i === -1) continue;
      personas[i].nombre = f.nombre;
      sumar(personas[i].conteo, f.respuesta);
      sumar(conteo, f.respuesta);
    }
    return { label: g.label, conteo, personas };
  });
}
